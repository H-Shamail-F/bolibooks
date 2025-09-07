const express = require('express');
const { models } = require('../database');
const { authMiddleware } = require('../middleware/auth');
const { Op } = require('sequelize');
const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Get dashboard statistics
router.get('/dashboard-stats', async (req, res) => {
  try {
    const companyId = req.user.companyId;
    
    // Get current month date range
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    // Get previous month for comparison
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    // Total revenue (sum of paid invoices)
    const totalRevenue = await models.Invoice.sum('paidAmount', {
      where: { companyId, status: ['paid', 'partially_paid'] }
    }) || 0;

    // Current month revenue
    const currentMonthRevenue = await models.Invoice.sum('paidAmount', {
      where: {
        companyId,
        status: ['paid', 'partially_paid'],
        paidAt: { [Op.between]: [currentMonthStart, currentMonthEnd] }
      }
    }) || 0;

    // Previous month revenue for comparison
    const previousMonthRevenue = await models.Invoice.sum('paidAmount', {
      where: {
        companyId,
        status: ['paid', 'partially_paid'],
        paidAt: { [Op.between]: [previousMonthStart, previousMonthEnd] }
      }
    }) || 0;

    // Current month expenses
    const currentMonthExpenses = await models.Expense.sum('amount', {
      where: {
        companyId,
        status: 'approved',
        date: { [Op.between]: [currentMonthStart, currentMonthEnd] }
      }
    }) || 0;

    // Outstanding invoices
    const outstandingInvoices = await models.Invoice.count({
      where: {
        companyId,
        status: ['sent', 'overdue'],
        balanceAmount: { [Op.gt]: 0 }
      }
    });

    // Total customers
    const totalCustomers = await models.Customer.count({
      where: { companyId, isActive: true }
    });

    // Total products
    const totalProducts = await models.Product.count({
      where: { companyId, isActive: true }
    });

    // Calculate percentage changes
    const revenueChange = previousMonthRevenue > 0 
      ? ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100 
      : 0;

    // Monthly revenue for chart (last 6 months)
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const monthlyRevenue = await models.Invoice.findAll({
      where: {
        companyId,
        status: ['paid', 'partially_paid'],
        paidAt: { [Op.gte]: sixMonthsAgo }
      },
      attributes: [
        [models.sequelize.fn('DATE_TRUNC', 'month', models.sequelize.col('paidAt')), 'month'],
        [models.sequelize.fn('SUM', models.sequelize.col('paidAmount')), 'revenue']
      ],
      group: [models.sequelize.fn('DATE_TRUNC', 'month', models.sequelize.col('paidAt'))],
      order: [[models.sequelize.fn('DATE_TRUNC', 'month', models.sequelize.col('paidAt')), 'ASC']],
      raw: true
    });

    res.json({
      totalRevenue,
      currentMonthRevenue,
      currentMonthExpenses,
      outstandingInvoices,
      totalCustomers,
      totalProducts,
      revenueChange,
      monthlyRevenue: monthlyRevenue.map(item => ({
        month: new Date(item.month).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        revenue: parseFloat(item.revenue) || 0
      }))
    });

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
});

// Get Profit & Loss report
router.get('/profit-loss', async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'month' } = req.query;
    const companyId = req.user.companyId;

    // Default to current year if no dates provided
    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), 0, 1);
    const end = endDate ? new Date(endDate) : new Date();

    // Get revenue data (from paid invoices)
    const revenueQuery = {
      where: {
        companyId,
        status: ['paid', 'partially_paid'],
        paidAt: { [Op.between]: [start, end] }
      },
      attributes: [
        [models.sequelize.fn('SUM', models.sequelize.col('paidAmount')), 'amount']
      ]
    };

    if (groupBy === 'month') {
      revenueQuery.attributes.push([
        models.sequelize.fn('DATE_TRUNC', 'month', models.sequelize.col('paidAt')), 
        'period'
      ]);
      revenueQuery.group = [models.sequelize.fn('DATE_TRUNC', 'month', models.sequelize.col('paidAt'))];
      revenueQuery.order = [[models.sequelize.fn('DATE_TRUNC', 'month', models.sequelize.col('paidAt')), 'ASC']];
    }

    const revenueData = await models.Invoice.findAll({
      ...revenueQuery,
      raw: true
    });

    // Get expense data
    const expenseQuery = {
      where: {
        companyId,
        status: 'approved',
        date: { [Op.between]: [start, end] }
      },
      attributes: [
        'category',
        [models.sequelize.fn('SUM', models.sequelize.col('amount')), 'amount']
      ],
      group: ['category'],
      raw: true
    };

    if (groupBy === 'month') {
      expenseQuery.attributes.push([
        models.sequelize.fn('DATE_TRUNC', 'month', models.sequelize.col('date')), 
        'period'
      ]);
      expenseQuery.group.push(models.sequelize.fn('DATE_TRUNC', 'month', models.sequelize.col('date')));
      expenseQuery.order = [[models.sequelize.fn('DATE_TRUNC', 'month', models.sequelize.col('date')), 'ASC']];
    }

    const expenseData = await models.Expense.findAll(expenseQuery);

    // Calculate totals
    const totalRevenue = revenueData.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
    const totalExpenses = expenseData.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
    const netProfit = totalRevenue - totalExpenses;

    // Group expenses by category
    const expensesByCategory = expenseData.reduce((acc, expense) => {
      if (!acc[expense.category]) {
        acc[expense.category] = 0;
      }
      acc[expense.category] += parseFloat(expense.amount || 0);
      return acc;
    }, {});

    res.json({
      period: {
        startDate: start,
        endDate: end,
        groupBy
      },
      summary: {
        totalRevenue,
        totalExpenses,
        netProfit,
        profitMargin: totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0
      },
      revenue: {
        total: totalRevenue,
        breakdown: revenueData.map(item => ({
          period: item.period || 'Total',
          amount: parseFloat(item.amount || 0)
        }))
      },
      expenses: {
        total: totalExpenses,
        byCategory: Object.entries(expensesByCategory).map(([category, amount]) => ({
          category,
          amount
        })),
        breakdown: expenseData.map(item => ({
          category: item.category,
          period: item.period || 'Total',
          amount: parseFloat(item.amount || 0)
        }))
      }
    });

  } catch (error) {
    console.error('Error generating P&L report:', error);
    res.status(500).json({ error: 'Failed to generate P&L report' });
  }
});

// Get sales report
router.get('/sales', async (req, res) => {
  try {
    const { startDate, endDate, customerId, groupBy = 'month' } = req.query;
    const companyId = req.user.companyId;

    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), 0, 1);
    const end = endDate ? new Date(endDate) : new Date();

    const whereClause = {
      companyId,
      status: { [Op.ne]: 'cancelled' },
      issueDate: { [Op.between]: [start, end] }
    };

    if (customerId) {
      whereClause.customerId = customerId;
    }

    // Sales by period
    const salesByPeriod = await models.Invoice.findAll({
      where: whereClause,
      attributes: [
        [models.sequelize.fn('DATE_TRUNC', groupBy, models.sequelize.col('issueDate')), 'period'],
        [models.sequelize.fn('COUNT', models.sequelize.col('id')), 'invoiceCount'],
        [models.sequelize.fn('SUM', models.sequelize.col('total')), 'totalAmount'],
        [models.sequelize.fn('SUM', models.sequelize.col('paidAmount')), 'paidAmount']
      ],
      group: [models.sequelize.fn('DATE_TRUNC', groupBy, models.sequelize.col('issueDate'))],
      order: [[models.sequelize.fn('DATE_TRUNC', groupBy, models.sequelize.col('issueDate')), 'ASC']],
      raw: true
    });

    // Sales by customer
    const salesByCustomer = await models.Invoice.findAll({
      where: whereClause,
      include: [{ model: models.Customer, attributes: ['name'] }],
      attributes: [
        'customerId',
        [models.sequelize.fn('COUNT', models.sequelize.col('Invoice.id')), 'invoiceCount'],
        [models.sequelize.fn('SUM', models.sequelize.col('total')), 'totalAmount'],
        [models.sequelize.fn('SUM', models.sequelize.col('paidAmount')), 'paidAmount']
      ],
      group: ['customerId', 'Customer.id', 'Customer.name'],
      order: [[models.sequelize.fn('SUM', models.sequelize.col('total')), 'DESC']],
      limit: 10,
      raw: true
    });

    // Product sales
    const productSales = await models.InvoiceItem.findAll({
      include: [
        {
          model: models.Invoice,
          where: whereClause,
          attributes: []
        },
        {
          model: models.Product,
          attributes: ['name', 'sku']
        }
      ],
      attributes: [
        'productId',
        [models.sequelize.fn('SUM', models.sequelize.col('quantity')), 'totalQuantity'],
        [models.sequelize.fn('SUM', models.sequelize.col('lineTotal')), 'totalAmount']
      ],
      group: ['productId', 'Product.id', 'Product.name', 'Product.sku'],
      order: [[models.sequelize.fn('SUM', models.sequelize.col('lineTotal')), 'DESC']],
      limit: 10,
      raw: true
    });

    // Calculate totals
    const totals = await models.Invoice.findOne({
      where: whereClause,
      attributes: [
        [models.sequelize.fn('COUNT', models.sequelize.col('id')), 'totalInvoices'],
        [models.sequelize.fn('SUM', models.sequelize.col('total')), 'totalSales'],
        [models.sequelize.fn('SUM', models.sequelize.col('paidAmount')), 'totalPaid'],
        [models.sequelize.fn('AVG', models.sequelize.col('total')), 'averageInvoice']
      ],
      raw: true
    });

    res.json({
      period: { startDate: start, endDate: end },
      summary: {
        totalInvoices: parseInt(totals.totalInvoices || 0),
        totalSales: parseFloat(totals.totalSales || 0),
        totalPaid: parseFloat(totals.totalPaid || 0),
        averageInvoice: parseFloat(totals.averageInvoice || 0),
        outstandingAmount: parseFloat(totals.totalSales || 0) - parseFloat(totals.totalPaid || 0)
      },
      salesByPeriod: salesByPeriod.map(item => ({
        period: item.period,
        invoiceCount: parseInt(item.invoiceCount),
        totalAmount: parseFloat(item.totalAmount || 0),
        paidAmount: parseFloat(item.paidAmount || 0)
      })),
      salesByCustomer: salesByCustomer.map(item => ({
        customerId: item.customerId,
        customerName: item['Customer.name'],
        invoiceCount: parseInt(item.invoiceCount),
        totalAmount: parseFloat(item.totalAmount || 0),
        paidAmount: parseFloat(item.paidAmount || 0)
      })),
      productSales: productSales.map(item => ({
        productId: item.productId,
        productName: item['Product.name'],
        sku: item['Product.sku'],
        totalQuantity: parseFloat(item.totalQuantity || 0),
        totalAmount: parseFloat(item.totalAmount || 0)
      }))
    });

  } catch (error) {
    console.error('Error generating sales report:', error);
    res.status(500).json({ error: 'Failed to generate sales report' });
  }
});

// Get inventory report
router.get('/inventory', async (req, res) => {
  try {
    const { category, lowStockOnly } = req.query;
    const companyId = req.user.companyId;

    const whereClause = { companyId, isActive: true };
    
    if (category) {
      whereClause.category = category;
    }

    if (lowStockOnly === 'true') {
      whereClause[Op.and] = [
        models.sequelize.where(
          models.sequelize.col('stockQuantity'),
          '<=',
          models.sequelize.col('lowStockThreshold')
        )
      ];
    }

    // Get product inventory data
    const products = await models.Product.findAll({
      where: whereClause,
      attributes: [
        'id', 'name', 'sku', 'category', 'unit', 'price', 'cost',
        'stockQuantity', 'lowStockThreshold', 'trackInventory'
      ],
      order: [['stockQuantity', 'ASC']]
    });

    // Get sales data for each product (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const salesData = await models.InvoiceItem.findAll({
      include: [
        {
          model: models.Invoice,
          where: {
            companyId,
            status: { [Op.ne]: 'cancelled' },
            issueDate: { [Op.gte]: thirtyDaysAgo }
          },
          attributes: []
        }
      ],
      attributes: [
        'productId',
        [models.sequelize.fn('SUM', models.sequelize.col('quantity')), 'soldQuantity'],
        [models.sequelize.fn('SUM', models.sequelize.col('lineTotal')), 'salesAmount']
      ],
      group: ['productId'],
      raw: true
    });

    // Combine product and sales data
    const inventoryReport = products.map(product => {
      const sales = salesData.find(s => s.productId === product.id) || { soldQuantity: 0, salesAmount: 0 };
      
      return {
        ...product.toJSON(),
        last30Days: {
          soldQuantity: parseFloat(sales.soldQuantity || 0),
          salesAmount: parseFloat(sales.salesAmount || 0)
        },
        inventoryValue: product.stockQuantity * product.cost,
        isLowStock: product.trackInventory && product.stockQuantity <= product.lowStockThreshold
      };
    });

    // Calculate summary statistics
    const summary = {
      totalProducts: products.length,
      totalStockValue: inventoryReport.reduce((sum, p) => sum + p.inventoryValue, 0),
      lowStockItems: inventoryReport.filter(p => p.isLowStock).length,
      outOfStockItems: inventoryReport.filter(p => p.stockQuantity === 0).length,
      totalSalesLast30Days: inventoryReport.reduce((sum, p) => sum + p.last30Days.salesAmount, 0)
    };

    // Category breakdown
    const categoryBreakdown = products.reduce((acc, product) => {
      const category = product.category || 'Uncategorized';
      if (!acc[category]) {
        acc[category] = {
          count: 0,
          stockValue: 0,
          lowStockCount: 0
        };
      }
      acc[category].count++;
      acc[category].stockValue += product.stockQuantity * product.cost;
      if (product.trackInventory && product.stockQuantity <= product.lowStockThreshold) {
        acc[category].lowStockCount++;
      }
      return acc;
    }, {});

    res.json({
      summary,
      products: inventoryReport,
      categoryBreakdown: Object.entries(categoryBreakdown).map(([category, data]) => ({
        category,
        ...data
      }))
    });

  } catch (error) {
    console.error('Error generating inventory report:', error);
    res.status(500).json({ error: 'Failed to generate inventory report' });
  }
});

// Get receivables report
router.get('/receivables', async (req, res) => {
  try {
    const { overdue, customerId } = req.query;
    const companyId = req.user.companyId;

    const whereClause = {
      companyId,
      status: { [Op.in]: ['sent', 'overdue', 'partially_paid'] },
      balanceAmount: { [Op.gt]: 0 }
    };

    if (customerId) {
      whereClause.customerId = customerId;
    }

    if (overdue === 'true') {
      whereClause.dueDate = { [Op.lt]: new Date() };
    }

    // Get outstanding invoices
    const outstandingInvoices = await models.Invoice.findAll({
      where: whereClause,
      include: [
        { model: models.Customer, attributes: ['name', 'email', 'phone'] }
      ],
      attributes: [
        'id', 'invoiceNumber', 'issueDate', 'dueDate', 'total', 
        'paidAmount', 'balanceAmount', 'status'
      ],
      order: [['dueDate', 'ASC']]
    });

    // Group by customer
    const customerReceivables = await models.Invoice.findAll({
      where: whereClause,
      include: [{ model: models.Customer, attributes: ['name', 'email'] }],
      attributes: [
        'customerId',
        [models.sequelize.fn('COUNT', models.sequelize.col('Invoice.id')), 'invoiceCount'],
        [models.sequelize.fn('SUM', models.sequelize.col('balanceAmount')), 'totalOutstanding']
      ],
      group: ['customerId', 'Customer.id', 'Customer.name', 'Customer.email'],
      order: [[models.sequelize.fn('SUM', models.sequelize.col('balanceAmount')), 'DESC']],
      raw: true
    });

    // Aging analysis
    const now = new Date();
    const aging = {
      current: 0,      // 0-30 days
      thirtyDays: 0,   // 31-60 days  
      sixtyDays: 0,    // 61-90 days
      ninetyDays: 0    // 90+ days
    };

    outstandingInvoices.forEach(invoice => {
      const daysDue = Math.floor((now - new Date(invoice.dueDate)) / (1000 * 60 * 60 * 24));
      const balance = parseFloat(invoice.balanceAmount);

      if (daysDue <= 0) {
        aging.current += balance;
      } else if (daysDue <= 30) {
        aging.thirtyDays += balance;
      } else if (daysDue <= 60) {
        aging.sixtyDays += balance;
      } else {
        aging.ninetyDays += balance;
      }
    });

    // Calculate summary
    const summary = {
      totalOutstanding: outstandingInvoices.reduce((sum, inv) => sum + parseFloat(inv.balanceAmount), 0),
      totalInvoices: outstandingInvoices.length,
      overdueAmount: outstandingInvoices
        .filter(inv => new Date(inv.dueDate) < now)
        .reduce((sum, inv) => sum + parseFloat(inv.balanceAmount), 0),
      overdueCount: outstandingInvoices.filter(inv => new Date(inv.dueDate) < now).length
    };

    res.json({
      summary,
      aging,
      outstandingInvoices: outstandingInvoices.map(inv => ({
        ...inv.toJSON(),
        daysDue: Math.floor((now - new Date(inv.dueDate)) / (1000 * 60 * 60 * 24)),
        isOverdue: new Date(inv.dueDate) < now
      })),
      customerReceivables: customerReceivables.map(item => ({
        customerId: item.customerId,
        customerName: item['Customer.name'],
        customerEmail: item['Customer.email'],
        invoiceCount: parseInt(item.invoiceCount),
        totalOutstanding: parseFloat(item.totalOutstanding || 0)
      }))
    });

  } catch (error) {
    console.error('Error generating receivables report:', error);
    res.status(500).json({ error: 'Failed to generate receivables report' });
  }
});

module.exports = router;
