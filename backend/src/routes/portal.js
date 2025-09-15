const express = require('express');
const { body, validationResult } = require('express-validator');
const { models } = require('../database');
const { authMiddleware } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// Apply authentication middleware to all portal routes
router.use(authMiddleware);

// Get company information for internal portal (authenticated users only)
router.get('/company-info', async (req, res) => {
  try {
    const companyId = req.user.companyId;
    
    const company = await models.Company.findOne({
      where: { id: companyId },
      attributes: ['id', 'name', 'logo', 'currency', 'gstEnabled', 'gstRate', 'settings'],
      include: [
        {
          model: models.Template,
          where: { type: ['quote', 'invoice'], isActive: true },
          required: false,
          order: [['type', 'ASC'], ['isDefault', 'DESC'], ['createdAt', 'DESC']]
        }
      ]
    });

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    res.json({
      company: {
        id: company.id,
        name: company.name,
        logo: company.logo,
        currency: company.currency,
        gstEnabled: company.gstEnabled,
        gstRate: company.gstRate,
        settings: company.settings || {}
      },
      templates: company.Templates || []
    });
  } catch (error) {
    console.error('Error fetching company information:', error);
    res.status(500).json({ error: 'Failed to fetch company information' });
  }
});

// Get company products/services for internal portal
router.get('/products', async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { category, search } = req.query;

    const whereClause = {
      companyId,
      isActive: true // Show all active products for internal users
    };

    if (category) {
      whereClause.category = category;
    }

    if (search) {
      whereClause[models.sequelize.Op.or] = [
        { name: { [models.sequelize.Op.iLike]: `%${search}%` } },
        { description: { [models.sequelize.Op.iLike]: `%${search}%` } }
      ];
    }

    const products = await models.Product.findAll({
      where: whereClause,
      attributes: ['id', 'name', 'description', 'price', 'unit', 'category', 'images'],
      order: [['category', 'ASC'], ['name', 'ASC']]
    });

    // Group products by category
    const categorizedProducts = products.reduce((acc, product) => {
      const category = product.category || 'Other';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(product);
      return acc;
    }, {});

    res.json({
      products: categorizedProducts,
      categories: Object.keys(categorizedProducts)
    });
  } catch (error) {
    console.error('Error fetching portal products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Create quotation or invoice (internal users only)
router.post('/create-document', [
  body('type').isIn(['quote', 'invoice']).withMessage('Type must be quote or invoice'),
  body('customerId').notEmpty().withMessage('Customer is required'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.productId').notEmpty().withMessage('Product ID is required'),
  body('items.*.quantity').isNumeric().withMessage('Quantity must be a number'),
  body('templateId').optional().isUUID(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const companyId = req.user.companyId;
    const { type, customerId, items, notes, templateId, dueDate } = req.body;

    // Verify company exists
    const company = await models.Company.findOne({
      where: { id: companyId }
    });

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Get customer information
    const customer = await models.Customer.findOne({
      where: { id: customerId, companyId }
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Validate and calculate items
    let subtotal = 0;
    const quoteItems = [];

    for (const item of items) {
      const product = await models.Product.findOne({
        where: { 
          id: item.productId, 
          companyId, 
          isActive: true 
        }
      });

      if (!product) {
        return res.status(404).json({ error: `Product with ID ${item.productId} not found` });
      }

      const quantity = parseFloat(item.quantity);
      const unitPrice = parseFloat(product.price);
      const lineTotal = quantity * unitPrice;
      
      subtotal += lineTotal;

      quoteItems.push({
        productId: item.productId,
        quantity,
        unitPrice,
        lineTotal,
        description: item.description || product.description
      });
    }

    // Calculate totals
    const gstAmount = company.gstEnabled ? (subtotal * (company.gstRate / 100)) : 0;
    const total = subtotal + gstAmount;

    // Generate document number
    const lastDocument = await models.Invoice.findOne({
      where: { companyId, type },
      order: [['createdAt', 'DESC']]
    });

    const prefix = type === 'quote' ? 'QTE' : 'INV';
    const documentNumber = lastDocument 
      ? `${prefix}-${String(parseInt(lastDocument.invoiceNumber.split('-')[1]) + 1).padStart(4, '0')}`
      : `${prefix}-0001`;

    // Set due date
    const docDueDate = dueDate ? new Date(dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // Create document (quote or invoice)
    const document = await models.Invoice.create({
      invoiceNumber: documentNumber,
      type,
      status: type === 'quote' ? 'draft' : 'sent',
      customerId: customer.id,
      companyId,
      createdBy: req.user.id, // Created by authenticated user
      templateId: templateId || null,
      issueDate: new Date(),
      dueDate: docDueDate,
      subtotal,
      gstEnabled: company.gstEnabled,
      gstRate: company.gstRate,
      gstAmount,
      total,
      notes: notes || `${type === 'quote' ? 'Quotation' : 'Invoice'} created via internal portal`,
      source: 'internal_portal'
    });

    // Create document items
    for (const item of quoteItems) {
      await models.InvoiceItem.create({
        ...item,
        invoiceId: document.id
      });
    }

    // Fetch complete document with items for response
    const completeDocument = await models.Invoice.findByPk(document.id, {
      include: [
        { model: models.Customer },
        { model: models.InvoiceItem, as: 'items', include: [
          { model: models.Product, attributes: ['name', 'unit'] }
        ]},
        { model: models.Template, required: false }
      ]
    });

    res.status(201).json({
      message: `${type === 'quote' ? 'Quotation' : 'Invoice'} created successfully`,
      document: completeDocument,
      documentId: document.id,
      documentNumber: document.invoiceNumber
    });
  } catch (error) {
    console.error('Error creating quote request:', error);
    res.status(500).json({ error: 'Failed to create document' });
  }
});

// Get document by ID (for internal users)
router.get('/document/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;

    const document = await models.Invoice.findOne({
      where: { 
        id, 
        companyId
      },
      include: [
        { model: models.Customer },
        { model: models.InvoiceItem, as: 'items', include: [
          { model: models.Product, attributes: ['name', 'unit', 'description'] }
        ]},
        { model: models.Template, required: false },
        { model: models.User, as: 'creator', attributes: ['firstName', 'lastName'], required: false }
      ]
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json({ document });
  } catch (error) {
    console.error('Error fetching document:', error);
    res.status(500).json({ error: 'Failed to fetch document' });
  }
});

// List documents (quotes and invoices) for internal users
router.get('/documents', async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { type, status, page = 1, limit = 20 } = req.query;
    
    const offset = (page - 1) * limit;
    const whereClause = { companyId };
    
    if (type) {
      whereClause.type = type;
    }
    
    if (status) {
      whereClause.status = status;
    }

    const { count, rows: documents } = await models.Invoice.findAndCountAll({
      where: whereClause,
      include: [
        { model: models.Customer, attributes: ['name', 'email'] },
        { model: models.User, as: 'creator', attributes: ['firstName', 'lastName'], required: false }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    res.json({
      documents,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// Get customers for dropdown/selection
router.get('/customers', async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { search } = req.query;
    
    const whereClause = { companyId, isActive: true };
    
    if (search) {
      whereClause[models.sequelize.Op.or] = [
        { name: { [models.sequelize.Op.iLike]: `%${search}%` } },
        { email: { [models.sequelize.Op.iLike]: `%${search}%` } }
      ];
    }
    
    const customers = await models.Customer.findAll({
      where: whereClause,
      attributes: ['id', 'name', 'email', 'phone'],
      order: [['name', 'ASC']],
      limit: 50
    });
    
    res.json({ customers });
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

module.exports = router;
