const express = require('express');
const { body, validationResult } = require('express-validator');
const { models } = require('../database');
const { authMiddleware } = require('../middleware/auth');
const multer = require('multer');
const csv = require('csv-parser');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');
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
router.get('/bulk-upload/template', (req, res) => {
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

  const ws = xlsx.utils.json_to_sheet(templateData);
  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, ws, 'Products');

  const buffer = xlsx.write(wb, { bookType: 'xlsx', type: 'buffer' });

  res.setHeader('Content-Disposition', 'attachment; filename=product-template.xlsx');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buffer);
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
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  return xlsx.utils.sheet_to_json(worksheet);
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
