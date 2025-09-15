const express = require('express');
const { body, validationResult } = require('express-validator');
const { models, sequelize } = require('../database');
const { authMiddleware } = require('../middleware/auth');
const PDFService = require('../services/PDFService');
const BarcodeUtils = require('../utils/barcodeUtils');
const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Middleware to check cashier permissions
const cashierMiddleware = (req, res, next) => {
  if (!['owner', 'admin', 'cashier'].includes(req.user.role)) {
    return res.status(403).json({ 
      success: false,
      message: 'Access denied. Cashier role required.' 
    });
  }
  next();
};

// Get products for POS (filterable by barcode, categories, etc.)
router.get('/products', cashierMiddleware, async (req, res) => {
  try {
    const { 
      category,
      search,
      barcode,
      inStock = true,
      page = 1,
      limit = 50
    } = req.query;
    
    const offset = (page - 1) * limit;
    const whereClause = { 
      companyId: req.user.companyId,
      isActive: true
    };
    
    // Add filters
    if (category) whereClause.category = category;
    if (search) {
      whereClause[sequelize.Op.or] = [
        { name: { [sequelize.Op.like]: `%${search}%` } },
        { sku: { [sequelize.Op.like]: `%${search}%` } }
      ];
    }
    if (barcode) whereClause.barcode = barcode;
    // For inStock filter, we'll handle it after the query for simplicity
    
    const products = await models.Product.findAndCountAll({
      where: whereClause,
      order: [['name', 'ASC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    // Add POS-specific data to products
    let posProducts = products.rows.map(product => ({
      ...product.toJSON(),
      stockInfo: {
        available: product.trackInventory ? product.stockQuantity > 0 : true,
        quantity: product.stockQuantity,
        lowStock: product.trackInventory && product.stockQuantity <= product.lowStockThreshold
      },
      posReady: product.trackInventory ? product.stockQuantity > 0 : true,
      suggestedQuantity: 1
    }));
    
    // Apply inStock filter after mapping
    if (inStock === 'true' || inStock === true) {
      posProducts = posProducts.filter(product => product.stockInfo.available);
    }
    
    res.json({
      success: true,
      data: {
        products: posProducts,
        totalCount: products.count,
        currentPage: parseInt(page),
        totalPages: Math.ceil(products.count / limit)
      }
    });
    
  } catch (error) {
    console.error('Error fetching POS products:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch products'
    });
  }
});

// Barcode scanning via POST for frontend compatibility
router.post('/products/barcode/scan', cashierMiddleware, async (req, res) => {
  try {
    const { barcode } = req.body;
    
    if (!barcode) {
      return res.status(400).json({
        success: false,
        message: 'Barcode is required'
      });
    }
    
    // Reuse the existing scan logic by calling the GET endpoint logic
    req.params.barcode = barcode;
    
    // Find product by barcode
    const product = await models.Product.findOne({
      where: { 
        barcode: barcode,
        companyId: req.user.companyId,
        isActive: true 
      }
    });
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found for this barcode',
        data: { barcode }
      });
    }
    
    // Check stock availability
    const stockInfo = {
      available: product.trackInventory ? product.stockQuantity > 0 : true,
      quantity: product.stockQuantity,
      lowStock: product.trackInventory && product.stockQuantity <= product.lowStockThreshold,
      canSell: product.trackInventory ? product.stockQuantity > 0 : true
    };
    
    res.json({
      success: true,
      product: {
        ...product.toJSON(),
        stockInfo,
        posReady: stockInfo.available,
        suggestedQuantity: 1
      }
    });
    
  } catch (error) {
    console.error('Error scanning barcode:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to scan barcode'
    });
  }
});

// Barcode scanning for POS - Get product by barcode
router.get('/scan/:barcode', cashierMiddleware, async (req, res) => {
  try {
    const { barcode } = req.params;
    
    // Validate barcode format first
    const barcodeInfo = BarcodeUtils.detectBarcodeType(barcode);
    if (!barcodeInfo.validation.valid) {
      return res.status(400).json({
        success: false,
        message: `Invalid barcode: ${barcodeInfo.validation.error}`,
        barcodeInfo
      });
    }

    // Find product by barcode
    const product = await models.Product.findOne({
      where: { 
        barcode: barcode,
        companyId: req.user.companyId,
        isActive: true 
      }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
        data: {
          barcode,
          barcodeType: barcodeInfo.type,
          suggestions: {
            createProduct: true,
            searchSimilar: `/api/products/search/barcode/${barcode.slice(0, -3)}`
          }
        }
      });
    }

    // Check stock availability
    const stockInfo = {
      available: product.trackInventory ? product.stockQuantity > 0 : true,
      quantity: product.stockQuantity,
      lowStock: product.trackInventory && product.stockQuantity <= product.lowStockThreshold,
      canSell: product.trackInventory ? product.stockQuantity > 0 : true
    };

    // If out of stock and inventory is tracked, warn but allow override
    if (product.trackInventory && product.stockQuantity <= 0) {
      return res.status(200).json({
        success: true,
        warning: 'Product is out of stock',
        data: {
          ...product.toJSON(),
          stockInfo,
          barcodeInfo: {
            type: barcodeInfo.type,
            formatted: BarcodeUtils.formatBarcodeForDisplay(barcode, barcodeInfo.type)
          },
          posReady: false // Indicate not ready for immediate sale
        }
      });
    }

    res.json({
      success: true,
      data: {
        ...product.toJSON(),
        stockInfo,
        barcodeInfo: {
          type: barcodeInfo.type,
          formatted: BarcodeUtils.formatBarcodeForDisplay(barcode, barcodeInfo.type)
        },
        posReady: true,
        suggestedQuantity: 1 // Default quantity for POS
      }
    });

  } catch (error) {
    console.error('Error scanning barcode:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to scan barcode'
    });
  }
});

// Bulk barcode scanning for multiple items
router.post('/scan/bulk', cashierMiddleware, async (req, res) => {
  try {
    const { barcodes } = req.body;

    if (!Array.isArray(barcodes) || barcodes.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Barcodes array is required'
      });
    }

    const results = [];
    const notFound = [];
    const invalid = [];

    for (const barcode of barcodes) {
      try {
        // Validate barcode
        const barcodeInfo = BarcodeUtils.detectBarcodeType(barcode);
        if (!barcodeInfo.validation.valid) {
          invalid.push({ barcode, error: barcodeInfo.validation.error });
          continue;
        }

        // Find product
        const product = await models.Product.findOne({
          where: { 
            barcode: barcode,
            companyId: req.user.companyId,
            isActive: true 
          }
        });

        if (!product) {
          notFound.push({ barcode, barcodeType: barcodeInfo.type });
          continue;
        }

        // Check stock
        const stockInfo = {
          available: product.trackInventory ? product.stockQuantity > 0 : true,
          quantity: product.stockQuantity,
          lowStock: product.trackInventory && product.stockQuantity <= product.lowStockThreshold
        };

        results.push({
          ...product.toJSON(),
          stockInfo,
          barcodeInfo: {
            type: barcodeInfo.type,
            formatted: BarcodeUtils.formatBarcodeForDisplay(barcode, barcodeInfo.type)
          },
          posReady: stockInfo.available,
          suggestedQuantity: 1
        });

      } catch (err) {
        invalid.push({ barcode, error: err.message });
      }
    }

    res.json({
      success: true,
      data: {
        found: results,
        notFound,
        invalid,
        stats: {
          total: barcodes.length,
          found: results.length,
          notFound: notFound.length,
          invalid: invalid.length
        }
      }
    });

  } catch (error) {
    console.error('Error bulk scanning barcodes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk scan barcodes'
    });
  }
});

// Quick add item to cart via barcode (for rapid scanning)
router.post('/quick-add/:barcode', cashierMiddleware, async (req, res) => {
  try {
    const { barcode } = req.params;
    const { quantity = 1, sessionId } = req.body;

    // Find product by barcode
    const product = await models.Product.findOne({
      where: { 
        barcode: barcode,
        companyId: req.user.companyId,
        isActive: true 
      }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
        barcode
      });
    }

    // Check stock availability
    if (product.trackInventory && product.stockQuantity < quantity) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock. Available: ${product.stockQuantity}, Requested: ${quantity}`,
        data: {
          available: product.stockQuantity,
          requested: quantity
        }
      });
    }

    // This would typically be stored in a cart/session in a real app
    // For now, we'll just return the item data for the frontend to handle
    const barcodeInfo = BarcodeUtils.detectBarcodeType(barcode);
    
    res.json({
      success: true,
      data: {
        item: {
          productId: product.id,
          productName: product.name,
          productSku: product.sku,
          barcode: product.barcode,
          quantity: parseFloat(quantity),
          unitPrice: parseFloat(product.price),
          lineTotal: parseFloat(product.price) * parseFloat(quantity)
        },
        product: {
          ...product.toJSON(),
          barcodeInfo: {
            type: barcodeInfo.type,
            formatted: BarcodeUtils.formatBarcodeForDisplay(barcode, barcodeInfo.type)
          }
        },
        sessionId
      },
      message: 'Item added to cart'
    });

  } catch (error) {
    console.error('Error quick adding item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add item'
    });
  }
});

// Get barcode scanning statistics
router.get('/scan/stats', async (req, res) => {
  try {
    const { startDate, endDate, cashierId } = req.query;
    const dateFilter = {};
    
    if (startDate && endDate) {
      dateFilter.date = {
        [sequelize.Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    const whereClause = {
      companyId: req.user.companyId,
      ...dateFilter
    };

    if (cashierId) whereClause.cashierId = cashierId;

    // Get most scanned products (based on POS sales)
    const mostScanned = await sequelize.query(`
      SELECT 
        p.barcode,
        p.name,
        p.sku,
        SUM(psi.quantity) as total_scanned,
        COUNT(DISTINCT ps.id) as transactions_count
      FROM pos_sale_items psi
      JOIN products p ON psi.productId = p.id
      JOIN pos_sales ps ON psi.saleId = ps.id
      WHERE ps.companyId = :companyId 
        AND p.barcode IS NOT NULL
        ${startDate && endDate ? 'AND ps.date BETWEEN :startDate AND :endDate' : ''}
        ${cashierId ? 'AND ps.cashierId = :cashierId' : ''}
      GROUP BY p.id, p.barcode, p.name, p.sku
      ORDER BY total_scanned DESC
      LIMIT 20
    `, {
      replacements: { 
        companyId: req.user.companyId,
        ...(startDate && endDate && { startDate, endDate }),
        ...(cashierId && { cashierId })
      },
      type: sequelize.QueryTypes.SELECT
    });

    // Count products with and without barcodes
    const barcodeStats = await models.Product.findAll({
      where: { companyId: req.user.companyId, isActive: true },
      attributes: [
        [sequelize.fn('COUNT', sequelize.literal('CASE WHEN barcode IS NOT NULL THEN 1 END')), 'withBarcode'],
        [sequelize.fn('COUNT', sequelize.literal('CASE WHEN barcode IS NULL THEN 1 END')), 'withoutBarcode'],
        [sequelize.fn('COUNT', '*'), 'total']
      ],
      raw: true
    });

    res.json({
      success: true,
      data: {
        mostScanned,
        barcodeStats: barcodeStats[0],
        period: {
          startDate: startDate || 'All time',
          endDate: endDate || 'Present',
          cashier: cashierId || 'All cashiers'
        }
      }
    });

  } catch (error) {
    console.error('Error fetching scan stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch scanning statistics'
    });
  }
});

// Get all POS sales for a company
router.get('/sales', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      startDate, 
      endDate, 
      cashierId, 
      status = 'completed',
      paymentMethod 
    } = req.query;
    
    const offset = (page - 1) * limit;
    const whereClause = { companyId: req.user.companyId };
    
    // Add filters
    if (status && status !== 'all') whereClause.status = status;
    if (cashierId) whereClause.cashierId = cashierId;
    if (paymentMethod) whereClause.paymentMethod = paymentMethod;
    
    if (startDate && endDate) {
      whereClause.date = {
        [sequelize.Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    const sales = await models.POSSale.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: models.User,
          as: 'Cashier',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: models.Customer,
          attributes: ['id', 'name', 'email'],
          required: false
        },
        {
          model: models.POSSaleItem,
          as: 'items',
          include: [{
            model: models.Product,
            attributes: ['id', 'name', 'sku']
          }]
        }
      ],
      order: [['date', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: {
        sales: sales.rows,
        totalCount: sales.count,
        currentPage: parseInt(page),
        totalPages: Math.ceil(sales.count / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching POS sales:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch POS sales'
    });
  }
});

// Get single POS sale
router.get('/sales/:id', async (req, res) => {
  try {
    const sale = await models.POSSale.findOne({
      where: { id: req.params.id, companyId: req.user.companyId },
      include: [
        {
          model: models.User,
          as: 'Cashier',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: models.Customer,
          attributes: ['id', 'name', 'email', 'phone', 'address'],
          required: false
        },
        {
          model: models.POSSaleItem,
          as: 'items',
          include: [{
            model: models.Product,
            attributes: ['id', 'name', 'sku', 'unit']
          }]
        }
      ]
    });

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'POS sale not found'
      });
    }

    res.json({
      success: true,
      data: sale
    });
  } catch (error) {
    console.error('Error fetching POS sale:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch POS sale'
    });
  }
});

// Create new POS sale
router.post('/sales', [
  cashierMiddleware,
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.productId').notEmpty().withMessage('Product ID is required'),
  body('items.*.quantity').isNumeric().withMessage('Quantity must be a number'),
  body('paymentMethod').isIn(['cash', 'card', 'bank_transfer', 'mobile_payment', 'mixed']).withMessage('Invalid payment method'),
  body('amountTendered').optional().isNumeric().withMessage('Amount tendered must be a number')
], async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const {
      items,
      paymentMethod,
      paymentDetails = {},
      amountTendered,
      customerId,
      customerInfo = {},
      notes,
      deviceInfo = {}
    } = req.body;

    // Validate and prepare sale items
    const saleItems = [];
    let subtotal = 0;
    let totalTaxAmount = 0;

    for (const item of items) {
      const product = await models.Product.findOne({
        where: { id: item.productId, companyId: req.user.companyId }
      });

      if (!product) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: `Product with ID ${item.productId} not found`
        });
      }

      // Check stock availability
      if (product.trackInventory && product.stockQuantity < item.quantity) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name}. Available: ${product.stockQuantity}, Required: ${item.quantity}`
        });
      }

      const quantity = parseFloat(item.quantity);
      const originalPrice = parseFloat(product.price);
      // Get tax rate from company (default to 10% if not found)
      let taxRate = 10; // Default 10%
      try {
        if (req.user.companyId) {
          const company = await models.Company.findByPk(req.user.companyId);
          taxRate = parseFloat(company?.gstRate || 10);
        }
      } catch (error) {
        console.log('Warning: Could not load company tax rate, using default 10%');
      }
      
      // Calculate discounts if provided
      const discountType = item.discountType || 'none';
      const discountValue = parseFloat(item.discountValue || 0);
      
      const saleItem = {
        productId: product.id,
        productName: product.name,
        productSku: product.sku,
        quantity,
        originalPrice,
        discountType,
        discountValue,
        taxRate,
        notes: item.notes
      };

      saleItems.push(saleItem);

      // Calculate line totals (will be done in model hooks)
      const discountAmount = discountType === 'percentage' 
        ? (originalPrice * quantity * discountValue) / 100
        : discountType === 'fixed' ? discountValue : 0;
      
      const lineSubtotal = (originalPrice * quantity) - discountAmount;
      const lineTax = (lineSubtotal * taxRate) / 100;
      
      subtotal += lineSubtotal;
      totalTaxAmount += lineTax;
    }

    const total = subtotal + totalTaxAmount;

    // Create POS sale
    const posSale = await models.POSSale.create({
      companyId: req.user.companyId,
      cashierId: req.user.id,
      subtotal,
      taxAmount: totalTaxAmount,
      total,
      paymentMethod,
      paymentDetails,
      amountTendered: paymentMethod === 'cash' ? amountTendered : null,
      customerId,
      customerInfo,
      notes,
      deviceInfo
    }, { transaction });

    // Create sale items
    const createdItems = [];
    for (const item of saleItems) {
      const saleItem = await models.POSSaleItem.create({
        saleId: posSale.id,
        ...item
      }, { transaction });
      
      createdItems.push(saleItem);
    }

    await transaction.commit();

    // Fetch complete sale data
    const completeSale = await models.POSSale.findByPk(posSale.id, {
      include: [
        {
          model: models.User,
          as: 'Cashier',
          attributes: ['id', 'firstName', 'lastName']
        },
        {
          model: models.POSSaleItem,
          as: 'items',
          include: [{
            model: models.Product,
            attributes: ['id', 'name', 'sku']
          }]
        }
      ]
    });

    res.status(201).json({
      success: true,
      data: completeSale,
      message: 'POS sale created successfully'
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Error creating POS sale:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create POS sale'
    });
  }
});

// Process refund
router.post('/sales/:id/refund', [
  cashierMiddleware,
  body('items').isArray({ min: 1 }).withMessage('At least one item to refund is required'),
  body('items.*.saleItemId').notEmpty().withMessage('Sale item ID is required'),
  body('items.*.quantity').isNumeric().withMessage('Refund quantity must be a number')
], async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { items, reason } = req.body;

    const sale = await models.POSSale.findOne({
      where: { id: req.params.id, companyId: req.user.companyId },
      include: [{ model: models.POSSaleItem, as: 'items' }]
    });

    if (!sale) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'POS sale not found'
      });
    }

    let refundAmount = 0;

    for (const refundItem of items) {
      const saleItem = sale.items.find(item => item.id === refundItem.saleItemId);
      
      if (!saleItem) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: `Sale item ${refundItem.saleItemId} not found`
        });
      }

      const refundQuantity = parseFloat(refundItem.quantity);
      const availableQuantity = saleItem.quantity - saleItem.refundedQuantity;

      if (refundQuantity > availableQuantity) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: `Cannot refund ${refundQuantity} of ${saleItem.productName}. Available: ${availableQuantity}`
        });
      }

      // Calculate refund amount for this item
      const refundPerUnit = saleItem.lineTotal / saleItem.quantity;
      refundAmount += refundPerUnit * refundQuantity;

      // Update sale item
      await saleItem.update({
        isRefunded: refundQuantity === availableQuantity,
        refundedQuantity: saleItem.refundedQuantity + refundQuantity
      }, { transaction });
    }

    // Update sale status
    const allItemsRefunded = sale.items.every(item => 
      item.quantity === (item.refundedQuantity + (items.find(ri => ri.saleItemId === item.id)?.quantity || 0))
    );

    const newStatus = allItemsRefunded ? 'refunded' : 'partially_refunded';
    await sale.update({ status: newStatus }, { transaction });

    await transaction.commit();

    res.json({
      success: true,
      data: {
        saleId: sale.id,
        refundAmount,
        status: newStatus
      },
      message: 'Refund processed successfully'
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Error processing refund:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process refund'
    });
  }
});

// Get daily sales report
router.get('/reports/daily', async (req, res) => {
  try {
    const { date, cashierId } = req.query;
    const reportDate = date ? new Date(date) : new Date();
    
    const startDate = new Date(reportDate);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(reportDate);
    endDate.setHours(23, 59, 59, 999);

    const whereClause = {
      companyId: req.user.companyId,
      date: { [sequelize.Op.between]: [startDate, endDate] },
      status: { [sequelize.Op.in]: ['completed', 'refunded', 'partially_refunded'] }
    };

    if (cashierId) whereClause.cashierId = cashierId;

    // Get sales summary
    const salesSummary = await models.POSSale.findAll({
      where: whereClause,
      attributes: [
        'paymentMethod',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('total')), 'totalAmount'],
        [sequelize.fn('SUM', sequelize.col('taxAmount')), 'totalTax']
      ],
      group: ['paymentMethod'],
      raw: true
    });

    // Get hourly sales
    const hourlySales = await sequelize.query(`
      SELECT 
        strftime('%H', date) as hour,
        COUNT(*) as sales_count,
        SUM(total) as total_amount
      FROM pos_sales 
      WHERE companyId = :companyId 
        AND date BETWEEN :startDate AND :endDate
        AND status IN ('completed', 'refunded', 'partially_refunded')
        ${cashierId ? 'AND cashierId = :cashierId' : ''}
      GROUP BY strftime('%H', date)
      ORDER BY hour
    `, {
      replacements: { 
        companyId: req.user.companyId, 
        startDate: startDate.toISOString(), 
        endDate: endDate.toISOString(),
        ...(cashierId && { cashierId })
      },
      type: sequelize.QueryTypes.SELECT
    });

    // Get top selling products
    const topProducts = await sequelize.query(`
      SELECT 
        p.name,
        p.sku,
        SUM(psi.quantity) as total_quantity,
        SUM(psi.lineTotal) as total_revenue
      FROM pos_sale_items psi
      JOIN products p ON psi.productId = p.id
      JOIN pos_sales ps ON psi.saleId = ps.id
      WHERE ps.companyId = :companyId 
        AND ps.date BETWEEN :startDate AND :endDate
        AND ps.status IN ('completed', 'refunded', 'partially_refunded')
        ${cashierId ? 'AND ps.cashierId = :cashierId' : ''}
      GROUP BY p.id, p.name, p.sku
      ORDER BY total_quantity DESC
      LIMIT 10
    `, {
      replacements: { 
        companyId: req.user.companyId, 
        startDate: startDate.toISOString(), 
        endDate: endDate.toISOString(),
        ...(cashierId && { cashierId })
      },
      type: sequelize.QueryTypes.SELECT
    });

    // Calculate totals
    const totalSales = salesSummary.reduce((sum, item) => sum + parseFloat(item.totalAmount || 0), 0);
    const totalTransactions = salesSummary.reduce((sum, item) => sum + parseInt(item.count || 0), 0);
    const totalTax = salesSummary.reduce((sum, item) => sum + parseFloat(item.totalTax || 0), 0);

    res.json({
      success: true,
      data: {
        date: reportDate.toISOString().split('T')[0],
        summary: {
          totalSales,
          totalTransactions,
          totalTax,
          averageTransaction: totalTransactions > 0 ? totalSales / totalTransactions : 0
        },
        paymentMethods: salesSummary,
        hourlySales,
        topProducts
      }
    });

  } catch (error) {
    console.error('Error generating daily sales report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate daily sales report'
    });
  }
});

// Generate receipt PDF
router.get('/sales/:id/receipt', async (req, res) => {
  try {
    const { templateId } = req.query;

    const sale = await models.POSSale.findOne({
      where: { id: req.params.id, companyId: req.user.companyId },
      include: [
        {
          model: models.User,
          as: 'Cashier',
          attributes: ['id', 'firstName', 'lastName']
        },
        {
          model: models.Customer,
          required: false
        },
        {
          model: models.POSSaleItem,
          as: 'items',
          include: [{
            model: models.Product,
            attributes: ['id', 'name', 'sku', 'unit']
          }]
        }
      ]
    });

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'POS sale not found'
      });
    }

    // Get receipt template
    let template;
    if (templateId) {
      template = await models.Template.findOne({
        where: { 
          id: templateId, 
          type: { [sequelize.Op.in]: ['receipt', 'pos'] },
          [sequelize.Op.or]: [
            { companyId: req.user.companyId },
            { isGlobal: true }
          ]
        }
      });
    } else {
      // Get default receipt template
      template = await models.Template.findOne({
        where: {
          type: { [sequelize.Op.in]: ['receipt', 'pos'] },
          [sequelize.Op.or]: [
            { companyId: req.user.companyId, isDefault: true },
            { isGlobal: true, isDefault: true }
          ]
        },
        order: [['isGlobal', 'ASC']] // Prefer company template over global
      });
    }

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'No receipt template found'
      });
    }

    // Get company info
    const company = await models.Company.findByPk(req.user.companyId);

    // Prepare receipt data
    const receiptData = {
      sale_number: sale.saleNumber,
      cashier_name: `${sale.Cashier.firstName} ${sale.Cashier.lastName}`,
      payment_method: sale.paymentMethod,
      amount_tendered: sale.amountTendered,
      change_given: sale.changeGiven,
      receipt_timestamp: sale.date,
      terminal_id: sale.deviceInfo.terminalId || 'POS-01',
      transaction_id: sale.id,

      // Standard document data
      document_number: sale.saleNumber,
      document_date: sale.date,
      subtotal: sale.subtotal,
      tax_amount: sale.taxAmount,
      total_amount: sale.total,
      items: sale.items.map(item => ({
        name: item.productName,
        quantity: item.quantity,
        price: item.unitPrice,
        lineTotal: item.lineTotal
      })),

      // Company info
      company_name: company.name,
      company_address: company.address,
      company_phone: company.phone,
      company_email: company.email,

      // Customer info
      customer_name: sale.Customer?.name || sale.customerInfo?.name || 'Walk-in Customer',
      customer_phone: sale.Customer?.phone || sale.customerInfo?.phone || ''
    };

    // Generate PDF receipt
    const pdfBuffer = await PDFService.generatePDF(template, receiptData);

    // Update receipt printed status
    await sale.update({ receiptPrinted: true });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="receipt-${sale.saleNumber}.pdf"`);
    res.send(pdfBuffer);

  } catch (error) {
    console.error('Error generating receipt:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate receipt'
    });
  }
});

module.exports = router;
