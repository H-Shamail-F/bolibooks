const express = require('express');
const { body, validationResult } = require('express-validator');
const { models } = require('../database');
const { Op } = require('sequelize');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Get all invoices for a company
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, status, customerId, startDate, endDate } = req.query;
    const offset = (page - 1) * limit;
    
    const whereClause = { companyId: req.user.companyId };
    
    if (status) whereClause.status = status;
    if (customerId) whereClause.customerId = customerId;
    if (startDate && endDate) {
      whereClause.issueDate = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    const invoices = await models.Invoice.findAndCountAll({
      where: whereClause,
      include: [
        { model: models.Customer, attributes: ['id', 'name', 'email'] },
        { model: models.InvoiceItem, as: 'items', include: [
          { model: models.Product, attributes: ['name', 'sku'] }
        ]},
        { model: models.Payment, attributes: ['id', 'amount', 'method', 'date'] }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      invoices: invoices.rows,
      totalCount: invoices.count,
      currentPage: parseInt(page),
      totalPages: Math.ceil(invoices.count / limit)
    });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

// Get single invoice
router.get('/:id', async (req, res) => {
  try {
    const invoice = await models.Invoice.findOne({
      where: { id: req.params.id, companyId: req.user.companyId },
      include: [
        { model: models.Customer },
        { model: models.InvoiceItem, as: 'items', include: [
          { model: models.Product }
        ]},
        { model: models.Payment },
        { model: models.Company, attributes: ['name', 'address', 'phone', 'email', 'logo', 'taxId'] }
      ]
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    res.json(invoice);
  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({ error: 'Failed to fetch invoice' });
  }
});

// Create new invoice
router.post('/', [
  body('customerId').notEmpty().withMessage('Customer is required'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.productId').notEmpty().withMessage('Product ID is required'),
  body('items.*.quantity').isNumeric().withMessage('Quantity must be a number'),
  body('items.*.unitPrice').isNumeric().withMessage('Unit price must be a number'),
  body('dueDate').isISO8601().withMessage('Valid due date is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { customerId, items, notes, gstEnabled, gstRate, dueDate } = req.body;

    // Calculate totals
    let subtotal = 0;
    const invoiceItems = [];

    for (const item of items) {
      const product = await models.Product.findOne({
        where: { id: item.productId, companyId: req.user.companyId }
      });

      if (!product) {
        return res.status(404).json({ error: `Product with ID ${item.productId} not found` });
      }

      const lineTotal = item.quantity * item.unitPrice;
      subtotal += lineTotal;

      invoiceItems.push({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal
      });
    }

    const gstAmount = gstEnabled ? (subtotal * (gstRate / 100)) : 0;
    const total = subtotal + gstAmount;

    // Generate invoice number
    const lastInvoice = await models.Invoice.findOne({
      where: { companyId: req.user.companyId },
      order: [['createdAt', 'DESC']]
    });

    const invoiceNumber = lastInvoice 
      ? `INV-${String(parseInt(lastInvoice.invoiceNumber.split('-')[1]) + 1).padStart(4, '0')}`
      : 'INV-0001';

    // Create invoice
    const invoice = await models.Invoice.create({
      invoiceNumber,
      customerId,
      companyId: req.user.companyId,
      createdBy: req.user.id,
      issueDate: new Date(),
      dueDate: new Date(dueDate),
      subtotal,
      gstEnabled,
      gstRate: gstEnabled ? gstRate : 0,
      gstAmount,
      total,
      status: 'draft',
      notes
    });

    // Create invoice items
    for (const item of invoiceItems) {
      await models.InvoiceItem.create({
        ...item,
        invoiceId: invoice.id
      });
    }

    // Fetch complete invoice with associations
    const completeInvoice = await models.Invoice.findByPk(invoice.id, {
      include: [
        { model: models.Customer },
        { model: models.InvoiceItem, as: 'items', include: [
          { model: models.Product }
        ]}
      ]
    });

    res.status(201).json(completeInvoice);
  } catch (error) {
    console.error('Error creating invoice:', error);
    res.status(500).json({ error: 'Failed to create invoice' });
  }
});

// Update invoice
router.put('/:id', async (req, res) => {
  try {
    const invoice = await models.Invoice.findOne({
      where: { id: req.params.id, companyId: req.user.companyId }
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    if (invoice.status === 'paid') {
      return res.status(400).json({ error: 'Cannot update paid invoices' });
    }

    await invoice.update(req.body);
    
    const updatedInvoice = await models.Invoice.findByPk(invoice.id, {
      include: [
        { model: models.Customer },
        { model: models.InvoiceItem, as: 'items', include: [
          { model: models.Product }
        ]}
      ]
    });

    res.json(updatedInvoice);
  } catch (error) {
    console.error('Error updating invoice:', error);
    res.status(500).json({ error: 'Failed to update invoice' });
  }
});

// Delete invoice
router.delete('/:id', async (req, res) => {
  try {
    const invoice = await models.Invoice.findOne({
      where: { id: req.params.id, companyId: req.user.companyId }
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    if (invoice.status === 'paid') {
      return res.status(400).json({ error: 'Cannot delete paid invoices' });
    }

    await invoice.destroy();
    res.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    console.error('Error deleting invoice:', error);
    res.status(500).json({ error: 'Failed to delete invoice' });
  }
});

// Convert quote to invoice
router.post('/:id/convert-to-invoice', async (req, res) => {
  try {
    const quote = await models.Invoice.findOne({
      where: { id: req.params.id, companyId: req.user.companyId, status: 'quote' }
    });

    if (!quote) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    await quote.update({ status: 'draft' });

    const updatedInvoice = await models.Invoice.findByPk(quote.id, {
      include: [
        { model: models.Customer },
        { model: models.InvoiceItem, as: 'items', include: [
          { model: models.Product }
        ]}
      ]
    });

    res.json(updatedInvoice);
  } catch (error) {
    console.error('Error converting quote to invoice:', error);
    res.status(500).json({ error: 'Failed to convert quote to invoice' });
  }
});

module.exports = router;
