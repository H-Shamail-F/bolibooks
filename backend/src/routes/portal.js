const express = require('express');
const { body, validationResult } = require('express-validator');
const { models } = require('../database');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// Get company portal information by portal ID or domain
router.get('/company/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;
    
    // Find company by portal identifier or custom domain
    const company = await models.Company.findOne({
      where: {
        [models.sequelize.Op.or]: [
          { id: identifier },
          { 'settings.portalId': identifier },
          { 'settings.customDomain': identifier }
        ],
        subscriptionStatus: ['trial', 'active']
      },
      attributes: ['id', 'name', 'logo', 'currency', 'gstEnabled', 'gstRate', 'settings'],
      include: [
        {
          model: models.Template,
          where: { type: 'quote', isActive: true },
          required: false,
          limit: 1,
          order: [['isDefault', 'DESC'], ['createdAt', 'DESC']]
        }
      ]
    });

    if (!company) {
      return res.status(404).json({ error: 'Company portal not found or inactive' });
    }

    // Check if portal is enabled
    if (!company.settings?.portalEnabled) {
      return res.status(403).json({ error: 'Customer portal is not enabled for this company' });
    }

    res.json({
      company: {
        id: company.id,
        name: company.name,
        logo: company.logo,
        currency: company.currency,
        gstEnabled: company.gstEnabled,
        gstRate: company.gstRate,
        portalSettings: company.settings.portal || {}
      },
      template: company.Templates?.[0] || null
    });
  } catch (error) {
    console.error('Error fetching company portal:', error);
    res.status(500).json({ error: 'Failed to fetch company information' });
  }
});

// Get company products/services for portal
router.get('/company/:companyId/products', async (req, res) => {
  try {
    const { companyId } = req.params;
    const { category, search } = req.query;

    // Verify company exists and portal is enabled
    const company = await models.Company.findOne({
      where: { 
        id: companyId,
        subscriptionStatus: ['trial', 'active'],
        'settings.portalEnabled': true
      }
    });

    if (!company) {
      return res.status(404).json({ error: 'Company not found or portal not enabled' });
    }

    const whereClause = {
      companyId,
      isActive: true,
      'settings.showInPortal': true // Only show products enabled for portal
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

// Create quote request from customer portal
router.post('/company/:companyId/quote-request', [
  body('customerInfo.name').notEmpty().withMessage('Customer name is required'),
  body('customerInfo.email').isEmail().withMessage('Valid email is required'),
  body('customerInfo.phone').optional().notEmpty().withMessage('Phone cannot be empty'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.productId').notEmpty().withMessage('Product ID is required'),
  body('items.*.quantity').isNumeric().withMessage('Quantity must be a number'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { companyId } = req.params;
    const { customerInfo, items, notes } = req.body;

    // Verify company exists and portal is enabled
    const company = await models.Company.findOne({
      where: { 
        id: companyId,
        subscriptionStatus: ['trial', 'active'],
        'settings.portalEnabled': true
      }
    });

    if (!company) {
      return res.status(404).json({ error: 'Company not found or portal not enabled' });
    }

    // Find or create customer
    let customer = await models.Customer.findOne({
      where: { email: customerInfo.email, companyId }
    });

    if (!customer) {
      customer = await models.Customer.create({
        ...customerInfo,
        companyId,
        notes: `Created via customer portal on ${new Date().toISOString()}`
      });
    } else {
      // Update customer info if changed
      await customer.update(customerInfo);
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

    // Generate quote number
    const lastQuote = await models.Invoice.findOne({
      where: { companyId, type: 'quote' },
      order: [['createdAt', 'DESC']]
    });

    const quoteNumber = lastQuote 
      ? `QTE-${String(parseInt(lastQuote.invoiceNumber.split('-')[1]) + 1).padStart(4, '0')}`
      : 'QTE-0001';

    // Create quote (using Invoice model with type='quote')
    const quote = await models.Invoice.create({
      invoiceNumber: quoteNumber,
      type: 'quote',
      status: 'draft',
      customerId: customer.id,
      companyId,
      createdBy: null, // Portal-generated quote
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days validity
      subtotal,
      gstEnabled: company.gstEnabled,
      gstRate: company.gstRate,
      gstAmount,
      total,
      notes: notes || 'Generated from customer portal',
      source: 'portal'
    });

    // Create quote items
    for (const item of quoteItems) {
      await models.InvoiceItem.create({
        ...item,
        invoiceId: quote.id
      });
    }

    // Fetch complete quote with items for response
    const completeQuote = await models.Invoice.findByPk(quote.id, {
      include: [
        { model: models.Customer },
        { model: models.InvoiceItem, as: 'items', include: [
          { model: models.Product, attributes: ['name', 'unit'] }
        ]}
      ]
    });

    // TODO: Send notification email to company about new quote request
    // TODO: Send confirmation email to customer

    res.status(201).json({
      message: 'Quote request submitted successfully',
      quote: completeQuote,
      quoteId: quote.id,
      trackingCode: `${companyId}-${quote.id}` // For customer to track status
    });
  } catch (error) {
    console.error('Error creating quote request:', error);
    res.status(500).json({ error: 'Failed to submit quote request' });
  }
});

// Get quote status by tracking code
router.get('/quote/:trackingCode', async (req, res) => {
  try {
    const { trackingCode } = req.params;
    const [companyId, quoteId] = trackingCode.split('-');

    const quote = await models.Invoice.findOne({
      where: { 
        id: quoteId, 
        companyId,
        type: 'quote'
      },
      include: [
        { model: models.Customer, attributes: ['name', 'email'] },
        { model: models.InvoiceItem, as: 'items', include: [
          { model: models.Product, attributes: ['name', 'unit'] }
        ]},
        { model: models.Company, attributes: ['name', 'logo', 'currency'] }
      ]
    });

    if (!quote) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    res.json({
      quote: {
        id: quote.id,
        quoteNumber: quote.invoiceNumber,
        status: quote.status,
        total: quote.total,
        currency: quote.Company.currency,
        issueDate: quote.issueDate,
        dueDate: quote.dueDate,
        customer: quote.Customer,
        items: quote.items,
        company: quote.Company,
        notes: quote.notes
      }
    });
  } catch (error) {
    console.error('Error fetching quote status:', error);
    res.status(500).json({ error: 'Failed to fetch quote status' });
  }
});

// Customer accepts/rejects quote
router.patch('/quote/:trackingCode/response', [
  body('response').isIn(['accept', 'reject']).withMessage('Response must be accept or reject'),
  body('customerNotes').optional().isString(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { trackingCode } = req.params;
    const { response, customerNotes } = req.body;
    const [companyId, quoteId] = trackingCode.split('-');

    const quote = await models.Invoice.findOne({
      where: { 
        id: quoteId, 
        companyId,
        type: 'quote',
        status: 'sent'
      }
    });

    if (!quote) {
      return res.status(404).json({ error: 'Quote not found or cannot be modified' });
    }

    const newStatus = response === 'accept' ? 'accepted' : 'rejected';
    const responseNotes = `${quote.notes}\n\nCustomer ${response}ed on ${new Date().toISOString()}${customerNotes ? ': ' + customerNotes : ''}`;

    await quote.update({
      status: newStatus,
      notes: responseNotes,
      customerResponse: {
        response,
        date: new Date(),
        notes: customerNotes
      }
    });

    // TODO: Send notification to company about customer response
    
    res.json({
      message: `Quote ${response}ed successfully`,
      status: newStatus
    });
  } catch (error) {
    console.error('Error updating quote response:', error);
    res.status(500).json({ error: 'Failed to update quote response' });
  }
});

module.exports = router;
