const express = require('express');
const { body, validationResult } = require('express-validator');
const { models } = require('../database');
const { authMiddleware } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Configure multer for receipt uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/receipts/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, req.user.companyId + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype) || file.mimetype.includes('pdf') || file.mimetype.includes('document');
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image, PDF, and document files are allowed'));
    }
  }
});

// Get all expenses for a company
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, category, vendor, startDate, endDate, status = 'approved' } = req.query;
    const offset = (page - 1) * limit;
    
    const whereClause = { companyId: req.user.companyId };
    
    if (category) whereClause.category = category;
    if (vendor) whereClause.vendor = { [models.sequelize.Op.iLike]: `%${vendor}%` };
    if (status !== 'all') whereClause.status = status;
    
    if (startDate && endDate) {
      whereClause.date = {
        [models.sequelize.Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    const expenses = await models.Expense.findAndCountAll({
      where: whereClause,
      include: [
        { model: models.User, as: 'Creator', attributes: ['id', 'firstName', 'lastName'] }
      ],
      order: [['date', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Calculate total amount for current filter
    const totalAmount = await models.Expense.sum('amount', { where: whereClause });

    res.json({
      expenses: expenses.rows,
      totalCount: expenses.count,
      totalAmount: totalAmount || 0,
      currentPage: parseInt(page),
      totalPages: Math.ceil(expenses.count / limit)
    });
  } catch (error) {
    console.error('Error fetching expenses:', error);
    res.status(500).json({ error: 'Failed to fetch expenses' });
  }
});

// Get expense categories
router.get('/categories', async (req, res) => {
  try {
    const categories = [
      'Rent', 'Utilities', 'Salaries', 'Supplies', 'Marketing', 'Travel',
      'Insurance', 'Professional Services', 'Equipment', 'Software',
      'Maintenance', 'Office Expenses', 'Telecommunications', 'Other'
    ];

    // Get usage count for each category
    const categoryUsage = await models.Expense.findAll({
      where: { companyId: req.user.companyId },
      attributes: [
        'category',
        [models.sequelize.fn('COUNT', models.sequelize.col('id')), 'count'],
        [models.sequelize.fn('SUM', models.sequelize.col('amount')), 'totalAmount']
      ],
      group: ['category'],
      raw: true
    });

    const categoriesWithUsage = categories.map(category => {
      const usage = categoryUsage.find(u => u.category === category) || { count: 0, totalAmount: 0 };
      return {
        name: category,
        count: parseInt(usage.count),
        totalAmount: parseFloat(usage.totalAmount) || 0
      };
    });

    res.json(categoriesWithUsage);
  } catch (error) {
    console.error('Error fetching expense categories:', error);
    res.status(500).json({ error: 'Failed to fetch expense categories' });
  }
});

// Get single expense
router.get('/:id', async (req, res) => {
  try {
    const expense = await models.Expense.findOne({
      where: { id: req.params.id, companyId: req.user.companyId },
      include: [
        { model: models.User, as: 'Creator', attributes: ['id', 'firstName', 'lastName'] },
        { model: models.User, as: 'Approver', attributes: ['id', 'firstName', 'lastName'] }
      ]
    });

    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    res.json(expense);
  } catch (error) {
    console.error('Error fetching expense:', error);
    res.status(500).json({ error: 'Failed to fetch expense' });
  }
});

// Create new expense
router.post('/', [
  body('category').isIn([
    'Rent', 'Utilities', 'Salaries', 'Supplies', 'Marketing', 'Travel',
    'Insurance', 'Professional Services', 'Equipment', 'Software',
    'Maintenance', 'Office Expenses', 'Telecommunications', 'Other'
  ]).withMessage('Invalid expense category'),
  body('description').notEmpty().withMessage('Description is required'),
  body('amount').isNumeric().withMessage('Amount must be a number'),
  body('date').optional().isISO8601().withMessage('Valid date is required'),
  body('paymentMethod').optional().isIn(['cash', 'bank_transfer', 'card', 'check', 'online', 'other']).withMessage('Invalid payment method'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const expenseData = {
      ...req.body,
      companyId: req.user.companyId,
      createdBy: req.user.id,
      date: req.body.date ? new Date(req.body.date) : new Date(),
      currency: req.body.currency || 'USD',
      tags: req.body.tags || []
    };

    const expense = await models.Expense.create(expenseData);

    const completeExpense = await models.Expense.findByPk(expense.id, {
      include: [
        { model: models.User, as: 'Creator', attributes: ['id', 'firstName', 'lastName'] }
      ]
    });

    res.status(201).json(completeExpense);
  } catch (error) {
    console.error('Error creating expense:', error);
    res.status(500).json({ error: 'Failed to create expense' });
  }
});

// Update expense
router.put('/:id', [
  body('category').optional().isIn([
    'Rent', 'Utilities', 'Salaries', 'Supplies', 'Marketing', 'Travel',
    'Insurance', 'Professional Services', 'Equipment', 'Software',
    'Maintenance', 'Office Expenses', 'Telecommunications', 'Other'
  ]).withMessage('Invalid expense category'),
  body('description').optional().notEmpty().withMessage('Description cannot be empty'),
  body('amount').optional().isNumeric().withMessage('Amount must be a number'),
  body('date').optional().isISO8601().withMessage('Valid date is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const expense = await models.Expense.findOne({
      where: { id: req.params.id, companyId: req.user.companyId }
    });

    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    // Only creator or admin can edit pending expenses
    if (expense.status === 'pending' && expense.createdBy !== req.user.id && !['owner', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'You can only edit your own pending expenses' });
    }

    // Approved expenses can only be edited by admins/owners
    if (expense.status === 'approved' && !['owner', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Only admins can edit approved expenses' });
    }

    await expense.update(req.body);

    const updatedExpense = await models.Expense.findByPk(expense.id, {
      include: [
        { model: models.User, as: 'Creator', attributes: ['id', 'firstName', 'lastName'] }
      ]
    });

    res.json(updatedExpense);
  } catch (error) {
    console.error('Error updating expense:', error);
    res.status(500).json({ error: 'Failed to update expense' });
  }
});

// Delete expense
router.delete('/:id', async (req, res) => {
  try {
    const expense = await models.Expense.findOne({
      where: { id: req.params.id, companyId: req.user.companyId }
    });

    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    // Only creator or admin can delete
    if (expense.createdBy !== req.user.id && !['owner', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'You can only delete your own expenses or you must be an admin' });
    }

    // Delete receipt file if it exists
    if (expense.receiptUrl) {
      try {
        await fs.unlink(path.join('uploads/receipts/', path.basename(expense.receiptUrl)));
      } catch (error) {
        console.log('Receipt file not found or already deleted');
      }
    }

    await expense.destroy();
    res.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    console.error('Error deleting expense:', error);
    res.status(500).json({ error: 'Failed to delete expense' });
  }
});

// Upload receipt for expense
router.post('/:id/receipt', upload.single('receipt'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No receipt file provided' });
    }

    const expense = await models.Expense.findOne({
      where: { id: req.params.id, companyId: req.user.companyId }
    });

    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    // Only creator can upload receipt
    if (expense.createdBy !== req.user.id && !['owner', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'You can only upload receipts for your own expenses' });
    }

    // Delete old receipt if it exists
    if (expense.receiptUrl) {
      try {
        await fs.unlink(path.join('uploads/receipts/', path.basename(expense.receiptUrl)));
      } catch (error) {
        console.log('Old receipt file not found or already deleted');
      }
    }

    const receiptUrl = `/uploads/receipts/${req.file.filename}`;
    await expense.update({ 
      receiptUrl: receiptUrl,
      receiptFilename: req.file.originalname
    });

    res.json({
      message: 'Receipt uploaded successfully',
      receiptUrl: receiptUrl,
      filename: req.file.originalname
    });
  } catch (error) {
    console.error('Error uploading receipt:', error);
    res.status(500).json({ error: 'Failed to upload receipt' });
  }
});

// Approve/reject expense (admin only)
router.patch('/:id/approval', [
  body('action').isIn(['approve', 'reject']).withMessage('Action must be approve or reject'),
  body('notes').optional().isString().withMessage('Notes must be a string'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (!['owner', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Only admins can approve/reject expenses' });
    }

    const { action, notes } = req.body;

    const expense = await models.Expense.findOne({
      where: { id: req.params.id, companyId: req.user.companyId }
    });

    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    const updateData = {
      status: action === 'approve' ? 'approved' : 'rejected',
      approvedBy: req.user.id,
      approvedAt: new Date()
    };

    if (notes) {
      updateData.notes = expense.notes ? `${expense.notes}\n\nApproval Notes: ${notes}` : `Approval Notes: ${notes}`;
    }

    await expense.update(updateData);

    const updatedExpense = await models.Expense.findByPk(expense.id, {
      include: [
        { model: models.User, as: 'Creator', attributes: ['id', 'firstName', 'lastName'] },
        { model: models.User, as: 'Approver', attributes: ['id', 'firstName', 'lastName'] }
      ]
    });

    res.json({
      message: `Expense ${action}d successfully`,
      expense: updatedExpense
    });
  } catch (error) {
    console.error('Error updating expense approval:', error);
    res.status(500).json({ error: 'Failed to update expense approval' });
  }
});

// Get expense statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const { startDate, endDate, category } = req.query;
    
    const whereClause = { 
      companyId: req.user.companyId,
      status: 'approved'
    };
    
    if (startDate && endDate) {
      whereClause.date = {
        [models.sequelize.Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }
    
    if (category) {
      whereClause.category = category;
    }

    // Get total and count
    const summary = await models.Expense.findOne({
      where: whereClause,
      attributes: [
        [models.sequelize.fn('COUNT', models.sequelize.col('id')), 'totalCount'],
        [models.sequelize.fn('SUM', models.sequelize.col('amount')), 'totalAmount'],
        [models.sequelize.fn('AVG', models.sequelize.col('amount')), 'averageAmount']
      ],
      raw: true
    });

    // Get monthly breakdown
    const monthlyBreakdown = await models.Expense.findAll({
      where: whereClause,
      attributes: [
        [models.sequelize.fn('DATE_TRUNC', 'month', models.sequelize.col('date')), 'month'],
        [models.sequelize.fn('SUM', models.sequelize.col('amount')), 'totalAmount'],
        [models.sequelize.fn('COUNT', models.sequelize.col('id')), 'count']
      ],
      group: [models.sequelize.fn('DATE_TRUNC', 'month', models.sequelize.col('date'))],
      order: [[models.sequelize.fn('DATE_TRUNC', 'month', models.sequelize.col('date')), 'ASC']],
      raw: true
    });

    // Get category breakdown
    const categoryBreakdown = await models.Expense.findAll({
      where: whereClause,
      attributes: [
        'category',
        [models.sequelize.fn('SUM', models.sequelize.col('amount')), 'totalAmount'],
        [models.sequelize.fn('COUNT', models.sequelize.col('id')), 'count']
      ],
      group: ['category'],
      order: [[models.sequelize.fn('SUM', models.sequelize.col('amount')), 'DESC']],
      raw: true
    });

    res.json({
      summary: {
        totalCount: parseInt(summary.totalCount) || 0,
        totalAmount: parseFloat(summary.totalAmount) || 0,
        averageAmount: parseFloat(summary.averageAmount) || 0
      },
      monthlyBreakdown: monthlyBreakdown.map(item => ({
        month: item.month,
        totalAmount: parseFloat(item.totalAmount),
        count: parseInt(item.count)
      })),
      categoryBreakdown: categoryBreakdown.map(item => ({
        category: item.category,
        totalAmount: parseFloat(item.totalAmount),
        count: parseInt(item.count)
      }))
    });
  } catch (error) {
    console.error('Error fetching expense statistics:', error);
    res.status(500).json({ error: 'Failed to fetch expense statistics' });
  }
});

module.exports = router;
