const express = require('express');
const { body, validationResult } = require('express-validator');
const { models } = require('../database');
const { authMiddleware } = require('../middleware/auth');
const multer = require('multer');
const csv = require('csv-parser');
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');
const BarcodeUtils = require('../utils/barcodeUtils');
const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/temp/',
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: function (req, file, cb) {
    const allowedTypes = /csv|xlsx|xls/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype) || file.mimetype.includes('spreadsheet');
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only CSV and Excel files are allowed'));
    }
  }
});

// Get all products for a company
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 50, search, category, isActive = 'true' } = req.query;
    const offset = (page - 1) * limit;
    
    const whereClause = { companyId: req.user.companyId };
    
    if (isActive !== 'all') {
      whereClause.isActive = isActive === 'true';
    }
    
    if (search) {
      whereClause[models.sequelize.Op.or] = [
        { name: { [models.sequelize.Op.iLike]: `%${search}%` } },
        { sku: { [models.sequelize.Op.iLike]: `%${search}%` } },
        { description: { [models.sequelize.Op.iLike]: `%${search}%` } }
      ];
    }
    
    if (category) {
      whereClause.category = category;
    }

    const products = await models.Product.findAndCountAll({
      where: whereClause,
      order: [['name', 'ASC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      products: products.rows,
      totalCount: products.count,
      currentPage: parseInt(page),
      totalPages: Math.ceil(products.count / limit)
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Get low stock products
router.get('/low-stock', async (req, res) => {
  try {
    const products = await models.Product.findAll({
      where: {
        companyId: req.user.companyId,
        trackInventory: true,
        isActive: true,
        [models.sequelize.Op.and]: [
          models.sequelize.where(
            models.sequelize.col('stockQuantity'),
            '<=',
            models.sequelize.col('lowStockThreshold')
          )
        ]
      },
      order: [['stockQuantity', 'ASC']]
    });

    res.json(products);
  } catch (error) {
    console.error('Error fetching low stock products:', error);
    res.status(500).json({ error: 'Failed to fetch low stock products' });
  }
});

// Get product categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await models.Product.findAll({
      where: { companyId: req.user.companyId, isActive: true },
      attributes: ['category'],
      group: ['category'],
      raw: true
    });

    const categoryList = categories
      .map(item => item.category)
      .filter(category => category && category.trim() !== '')
      .sort();

    res.json(categoryList);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Get product by barcode
router.get('/barcode/:barcode', async (req, res) => {
  try {
    const product = await models.Product.findOne({
      where: { 
        barcode: req.params.barcode, 
        companyId: req.user.companyId,
        isActive: true 
      }
    });

    if (!product) {
      return res.status(404).json({ 
        success: false,
        message: 'Product not found',
        barcode: req.params.barcode
      });
    }

    // Check stock availability for POS use
    const stockInfo = {
      available: product.trackInventory ? product.stockQuantity > 0 : true,
      quantity: product.stockQuantity,
      lowStock: product.trackInventory && product.stockQuantity <= product.lowStockThreshold
    };

    res.json({
      success: true,
      data: {
        ...product.toJSON(),
        stockInfo
      }
    });
  } catch (error) {
    console.error('Error fetching product by barcode:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch product by barcode' 
    });
  }
});

// Validate barcode (check if it's already in use)
router.get('/barcode-check/:barcode', async (req, res) => {
  try {
    const existingProduct = await models.Product.findOne({
      where: { 
        barcode: req.params.barcode,
        companyId: req.user.companyId 
      }
    });

    res.json({
      success: true,
      data: {
        available: !existingProduct,
        existingProduct: existingProduct ? {
          id: existingProduct.id,
          name: existingProduct.name,
          sku: existingProduct.sku,
          isActive: existingProduct.isActive
        } : null
      }
    });
  } catch (error) {
    console.error('Error checking barcode availability:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to check barcode availability' 
    });
  }
});

// Search products by barcode pattern (for partial barcode scanning)
router.get('/search/barcode/:pattern', async (req, res) => {
  try {
    const { pattern } = req.params;
    const { limit = 10 } = req.query;

    if (pattern.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Search pattern must be at least 3 characters'
      });
    }

    const products = await models.Product.findAll({
      where: {
        companyId: req.user.companyId,
        isActive: true,
        barcode: {
          [models.sequelize.Op.like]: `%${pattern}%`
        }
      },
      attributes: ['id', 'name', 'sku', 'barcode', 'price', 'stockQuantity', 'lowStockThreshold', 'trackInventory'],
      limit: parseInt(limit),
      order: [['name', 'ASC']]
    });

    res.json({
      success: true,
      data: products.map(product => ({
        ...product.toJSON(),
        stockInfo: {
          available: product.trackInventory ? product.stockQuantity > 0 : true,
          quantity: product.stockQuantity,
          lowStock: product.trackInventory && product.stockQuantity <= product.lowStockThreshold
        }
      }))
    });
  } catch (error) {
    console.error('Error searching products by barcode:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to search products by barcode' 
    });
  }
});

// Get single product
router.get('/:id', async (req, res) => {
  try {
    const product = await models.Product.findOne({
      where: { id: req.params.id, companyId: req.user.companyId }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// Create new product
router.post('/', [
  body('name').notEmpty().withMessage('Product name is required'),
  body('price').isNumeric().withMessage('Price must be a number'),
  body('cost').optional().isNumeric().withMessage('Cost must be a number'),
  body('stockQuantity').optional().isInt({ min: 0 }).withMessage('Stock quantity must be a non-negative integer'),
  body('lowStockThreshold').optional().isInt({ min: 0 }).withMessage('Low stock threshold must be a non-negative integer'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const productData = {
      ...req.body,
      companyId: req.user.companyId
    };

    // Check for duplicate SKU within the company
    if (productData.sku) {
      const existingProduct = await models.Product.findOne({
        where: { 
          sku: productData.sku, 
          companyId: req.user.companyId 
        }
      });

      if (existingProduct) {
        return res.status(400).json({ error: 'Product with this SKU already exists' });
      }
    }

    const product = await models.Product.create(productData);
    res.status(201).json(product);
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// Update product
router.put('/:id', [
  body('name').optional().notEmpty().withMessage('Product name cannot be empty'),
  body('price').optional().isNumeric().withMessage('Price must be a number'),
  body('cost').optional().isNumeric().withMessage('Cost must be a number'),
  body('stockQuantity').optional().isInt({ min: 0 }).withMessage('Stock quantity must be a non-negative integer'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const product = await models.Product.findOne({
      where: { id: req.params.id, companyId: req.user.companyId }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check for duplicate SKU if SKU is being updated
    if (req.body.sku && req.body.sku !== product.sku) {
      const existingProduct = await models.Product.findOne({
        where: { 
          sku: req.body.sku, 
          companyId: req.user.companyId,
          id: { [models.sequelize.Op.ne]: req.params.id }
        }
      });

      if (existingProduct) {
        return res.status(400).json({ error: 'Product with this SKU already exists' });
      }
    }

    await product.update(req.body);
    res.json(product);
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// Delete product (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const product = await models.Product.findOne({
      where: { id: req.params.id, companyId: req.user.companyId }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check if product is used in any invoices
    const invoiceItemCount = await models.InvoiceItem.count({
      where: { productId: req.params.id }
    });

    if (invoiceItemCount > 0) {
      // Soft delete - set isActive to false
      await product.update({ isActive: false });
      res.json({ message: 'Product deactivated successfully (used in existing invoices)' });
    } else {
      // Hard delete if not used in any invoices
      await product.destroy();
      res.json({ message: 'Product deleted successfully' });
    }
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// Bulk upload products via CSV/Excel
router.post('/bulk-upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const filePath = req.file.path;
    const fileExtension = path.extname(req.file.originalname).toLowerCase();
    
    let products = [];
    
    // Parse different file types
    if (fileExtension === '.csv') {
      products = await parseCSV(filePath);
    } else if (fileExtension === '.xlsx' || fileExtension === '.xls') {
      products = await parseExcel(filePath);
    } else {
      return res.status(400).json({ error: 'Unsupported file type' });
    }

    // Validate and process products
    const validationResults = await validateAndProcessProducts(products, req.user.companyId);
    
    // Clean up uploaded file
    fs.unlinkSync(filePath);

    if (validationResults.errors.length > 0) {
      return res.status(400).json({
        error: 'Validation errors found',
        errors: validationResults.errors,
        validCount: validationResults.validProducts.length
      });
    }

    // Insert valid products
    const createdProducts = await models.Product.bulkCreate(
      validationResults.validProducts.map(product => ({
        ...product,
        companyId: req.user.companyId
      })),
      { ignoreDuplicates: true, returning: true }
    );

    res.json({
      message: 'Products uploaded successfully',
      totalProcessed: products.length,
      totalCreated: createdProducts.length,
      products: createdProducts
    });

  } catch (error) {
    console.error('Error in bulk upload:', error);
    res.status(500).json({ error: 'Failed to process bulk upload' });
  }
});

// Download bulk upload template
router.get('/bulk-upload/template', async (req, res) => {
  try {
    const templateData = [
      {
        name: 'Sample Product 1',
        description: 'Sample product description',
        sku: 'SP001',
        category: 'Electronics',
        unit: 'pcs',
        price: 99.99,
        cost: 50.00,
        stockQuantity: 100,
        lowStockThreshold: 10,
        trackInventory: true,
        tags: 'electronics,sample'
      },
      {
        name: 'Sample Product 2',
        description: 'Another sample product',
        sku: 'SP002',
        category: 'Books',
        unit: 'pcs',
        price: 29.99,
        cost: 15.00,
        stockQuantity: 50,
        lowStockThreshold: 5,
        trackInventory: true,
        tags: 'books,education'
      }
    ];

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Products');
    
    // Add headers
    const headers = Object.keys(templateData[0]);
    worksheet.addRow(headers);
    
    // Add data rows
    templateData.forEach(row => {
      worksheet.addRow(Object.values(row));
    });
    
    // Style the header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFCCCCCC' }
    };
    
    // Auto-fit column widths
    worksheet.columns.forEach(column => {
      column.width = 15;
    });

    const buffer = await workbook.xlsx.writeBuffer();

    res.setHeader('Content-Disposition', 'attachment; filename=product-template.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    console.error('Error generating template:', error);
    res.status(500).json({ error: 'Failed to generate template' });
  }
});

// Helper functions
async function parseCSV(filePath) {
  return new Promise((resolve, reject) => {
    const products = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => products.push(data))
      .on('end', () => resolve(products))
      .on('error', (error) => reject(error));
  });
}

async function parseExcel(filePath) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const worksheet = workbook.getWorksheet(1); // Get first worksheet
  
  const jsonData = [];
  const headerRow = worksheet.getRow(1);
  const headers = [];
  
  // Extract headers
  headerRow.eachCell((cell, colNumber) => {
    headers[colNumber] = cell.text;
  });
  
  // Extract data rows
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) { // Skip header row
      const rowData = {};
      row.eachCell((cell, colNumber) => {
        const header = headers[colNumber];
        if (header) {
          rowData[header] = cell.text;
        }
      });
      jsonData.push(rowData);
    }
  });
  
  return jsonData;
}

async function validateAndProcessProducts(products, companyId) {
  const validProducts = [];
  const errors = [];

  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    const rowNumber = i + 2; // +2 because Excel rows start at 1 and first row is header

    try {
      // Required field validation
      if (!product.name || product.name.trim() === '') {
        errors.push(`Row ${rowNumber}: Product name is required`);
        continue;
      }

      if (!product.price || isNaN(parseFloat(product.price))) {
        errors.push(`Row ${rowNumber}: Valid price is required`);
        continue;
      }

      // Check for duplicate SKU in existing products
      if (product.sku) {
        const existingProduct = await models.Product.findOne({
          where: { sku: product.sku, companyId }
        });

        if (existingProduct) {
          errors.push(`Row ${rowNumber}: SKU '${product.sku}' already exists`);
          continue;
        }
      }

      // Process and clean data
      const processedProduct = {
        name: product.name.trim(),
        description: product.description ? product.description.trim() : null,
        sku: product.sku ? product.sku.trim() : null,
        category: product.category ? product.category.trim() : null,
        unit: product.unit ? product.unit.trim() : 'pcs',
        price: parseFloat(product.price),
        cost: product.cost ? parseFloat(product.cost) : 0,
        stockQuantity: product.stockQuantity ? parseInt(product.stockQuantity) : 0,
        lowStockThreshold: product.lowStockThreshold ? parseInt(product.lowStockThreshold) : 5,
        trackInventory: product.trackInventory === 'true' || product.trackInventory === true,
        isActive: true,
        tags: product.tags ? product.tags.split(',').map(tag => tag.trim()) : []
      };

      validProducts.push(processedProduct);

    } catch (error) {
      errors.push(`Row ${rowNumber}: ${error.message}`);
    }
  }

  return { validProducts, errors };
}

// Generate barcode for product
router.post('/:id/generate-barcode', async (req, res) => {
  try {
    const { type = 'EAN-13', companyPrefix } = req.body;

    const product = await models.Product.findOne({
      where: { id: req.params.id, companyId: req.user.companyId }
    });

    if (!product) {
      return res.status(404).json({ 
        success: false, 
        message: 'Product not found' 
      });
    }

    if (product.barcode) {
      return res.status(400).json({ 
        success: false, 
        message: 'Product already has a barcode', 
        existingBarcode: product.barcode 
      });
    }

    // Get company preferences for barcode generation
    const company = await models.Company.findByPk(req.user.companyId);
    const preferences = {
      type,
      companyPrefix: companyPrefix || company?.settings?.barcodePrefix,
    };

    let barcode;
    let attempts = 0;
    do {
      barcode = BarcodeUtils.generateBarcodeForProduct(req.user.companyId, product, preferences);
      
      // Check if barcode already exists
      const existing = await models.Product.findOne({
        where: { barcode, companyId: req.user.companyId }
      });
      
      if (!existing) break;
      attempts++;
    } while (attempts < 10);

    if (attempts >= 10) {
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to generate unique barcode after 10 attempts' 
      });
    }

    // Update product with generated barcode
    await product.update({ barcode });

    const barcodeInfo = BarcodeUtils.detectBarcodeType(barcode);

    res.json({
      success: true,
      data: {
        productId: product.id,
        productName: product.name,
        barcode,
        barcodeType: barcodeInfo.type,
        formatted: BarcodeUtils.formatBarcodeForDisplay(barcode, barcodeInfo.type),
        validation: barcodeInfo.validation
      },
      message: 'Barcode generated successfully'
    });

  } catch (error) {
    console.error('Error generating barcode:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to generate barcode' 
    });
  }
});

// Validate barcode format
router.post('/validate-barcode', (req, res) => {
  try {
    const { barcode } = req.body;

    if (!barcode) {
      return res.status(400).json({ 
        success: false, 
        message: 'Barcode is required' 
      });
    }

    const barcodeInfo = BarcodeUtils.detectBarcodeType(barcode);

    res.json({
      success: true,
      data: {
        barcode,
        type: barcodeInfo.type,
        validation: barcodeInfo.validation,
        formatted: BarcodeUtils.formatBarcodeForDisplay(barcode, barcodeInfo.type)
      }
    });

  } catch (error) {
    console.error('Error validating barcode:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to validate barcode' 
    });
  }
});

// Bulk generate barcodes for products without barcodes
router.post('/bulk-generate-barcodes', async (req, res) => {
  try {
    const { type = 'EAN-13', companyPrefix, productIds } = req.body;

    const whereClause = {
      companyId: req.user.companyId,
      barcode: null // Only products without barcodes
    };

    if (productIds && Array.isArray(productIds)) {
      whereClause.id = { [models.sequelize.Op.in]: productIds };
    }

    const products = await models.Product.findAll({
      where: whereClause,
      attributes: ['id', 'name', 'sku']
    });

    if (products.length === 0) {
      return res.json({
        success: true,
        data: { generated: [], skipped: 0 },
        message: 'No products found that need barcodes'
      });
    }

    // Get company preferences
    const company = await models.Company.findByPk(req.user.companyId);
    const preferences = {
      type,
      companyPrefix: companyPrefix || company?.settings?.barcodePrefix,
    };

    const results = BarcodeUtils.batchGenerateBarcodes(req.user.companyId, products, preferences);
    const successful = results.filter(r => !r.error);
    const failed = results.filter(r => r.error);

    // Update products with generated barcodes
    for (const result of successful) {
      await models.Product.update(
        { barcode: result.barcode },
        { where: { id: result.productId, companyId: req.user.companyId } }
      );
    }

    res.json({
      success: true,
      data: {
        generated: successful.map(r => ({
          productId: r.productId,
          barcode: r.barcode,
          type: r.type,
          formatted: BarcodeUtils.formatBarcodeForDisplay(r.barcode, r.type)
        })),
        failed: failed.map(r => ({
          productId: r.productId,
          error: r.error
        })),
        stats: {
          totalProcessed: results.length,
          successful: successful.length,
          failed: failed.length
        }
      },
      message: `Generated ${successful.length} barcodes successfully`
    });

  } catch (error) {
    console.error('Error bulk generating barcodes:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to bulk generate barcodes' 
    });
  }
});

// Adjust stock for product (used when creating invoices)
router.patch('/:id/adjust-stock', async (req, res) => {
  try {
    const { quantity, operation } = req.body; // operation: 'add' or 'subtract'

    if (!['add', 'subtract'].includes(operation)) {
      return res.status(400).json({ error: 'Invalid operation. Use "add" or "subtract"' });
    }

    if (!quantity || quantity <= 0) {
      return res.status(400).json({ error: 'Quantity must be a positive number' });
    }

    const product = await models.Product.findOne({
      where: { id: req.params.id, companyId: req.user.companyId }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (!product.trackInventory) {
      return res.status(400).json({ error: 'Inventory tracking is not enabled for this product' });
    }

    const newQuantity = operation === 'add' 
      ? product.stockQuantity + parseInt(quantity)
      : product.stockQuantity - parseInt(quantity);

    if (newQuantity < 0) {
      return res.status(400).json({ error: 'Insufficient stock quantity' });
    }

    await product.update({ stockQuantity: newQuantity });
    res.json({ 
      message: 'Stock quantity updated successfully',
      product,
      previousQuantity: product.stockQuantity,
      newQuantity
    });

  } catch (error) {
    console.error('Error adjusting stock:', error);
    res.status(500).json({ error: 'Failed to adjust stock quantity' });
  }
});

module.exports = router;
