const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { authMiddleware } = require('../middleware/auth');
const { requireAdvancedReporting } = require('../middleware/subscription');
const financialService = require('../services/financialService');
const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Utility functions
function formatPeriodName(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
}

function calculateComparisonPeriod(startDate, endDate, comparison) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const periodLength = end.getTime() - start.getTime();
  
  if (comparison === 'previous_period') {
    return {
      startDate: new Date(start.getTime() - periodLength).toISOString(),
      endDate: start.toISOString()
    };
  } else if (comparison === 'previous_year') {
    return {
      startDate: new Date(start.getFullYear() - 1, start.getMonth(), start.getDate()).toISOString(),
      endDate: new Date(end.getFullYear() - 1, end.getMonth(), end.getDate()).toISOString()
    };
  }
  return { startDate, endDate };
}

function calculateComparisonDate(asOfDate, comparison) {
  const date = new Date(asOfDate);
  if (comparison === 'previous_month') {
    return new Date(date.getFullYear(), date.getMonth() - 1, date.getDate()).toISOString();
  } else if (comparison === 'previous_year') {
    return new Date(date.getFullYear() - 1, date.getMonth(), date.getDate()).toISOString();
  }
  return asOfDate;
}

function calculateVariance(current, comparison) {
  return {
    revenue: {
      amount: current.revenue.total - comparison.revenue.total,
      percentage: comparison.revenue.total ? ((current.revenue.total - comparison.revenue.total) / comparison.revenue.total) * 100 : 0
    },
    netIncome: {
      amount: current.netIncome.amount - comparison.netIncome.amount,
      percentage: comparison.netIncome.amount ? ((current.netIncome.amount - comparison.netIncome.amount) / comparison.netIncome.amount) * 100 : 0
    }
  };
}

function calculateBalanceSheetVariance(current, comparison) {
  return {
    assets: {
      amount: current.totals.assets - comparison.totals.assets,
      percentage: comparison.totals.assets ? ((current.totals.assets - comparison.totals.assets) / comparison.totals.assets) * 100 : 0
    }
  };
}

async function generateProfitLossComparison() {
  // Simplified comparison data - return mock data for now
  return {
    revenue: { total: 0 },
    netIncome: { amount: 0 }
  };
}

async function generateBalanceSheetComparison() {
  // Simplified comparison data - return mock data for now
  return {
    totals: { assets: 0 }
  };
}

function generateProfitLossForExport() { return {}; }
function generateBalanceSheetForExport() { return {}; }
function generateCashFlowForExport() { return {}; }
function generateTrialBalanceForExport() { return {}; }
function exportToPDF() { return {}; }
function exportToExcel() { return {}; }
function exportToCSV() { return {}; }

/**
 * Profit & Loss Statement
 */
router.get('/profit-loss', [
  requireAdvancedReporting,
  query('startDate').isISO8601().withMessage('Valid start date required'),
  query('endDate').isISO8601().withMessage('Valid end date required'),
  query('comparison').optional().isIn(['none', 'previous_period', 'previous_year']).withMessage('Invalid comparison type')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { startDate, endDate, comparison = 'none' } = req.query;
    const companyId = req.user.companyId;

    // Revenue Section
    const revenue = await financialService.calculateRevenue(companyId, startDate, endDate);
    
    // Cost of Goods Sold
    const cogs = await financialService.calculateCOGS(companyId, startDate, endDate);
    
    // Gross Profit
    const grossProfit = revenue.total - cogs.total;
    const grossMargin = revenue.total > 0 ? (grossProfit / revenue.total) * 100 : 0;

    // Operating Expenses
    const operatingExpenses = await financialService.calculateOperatingExpenses(companyId, startDate, endDate);
    
    // Operating Income
    const operatingIncome = grossProfit - operatingExpenses.total;
    const operatingMargin = revenue.total > 0 ? (operatingIncome / revenue.total) * 100 : 0;

    // Other Income/Expenses
    const otherIncome = { total: 0, breakdown: { interest: 0, investments: 0, other: 0 } };
    const otherExpenses = await financialService.calculateOtherExpenses(companyId, startDate, endDate);

    // Net Income
    const netIncome = operatingIncome + otherIncome.total - otherExpenses.total;
    const netMargin = revenue.total > 0 ? (netIncome / revenue.total) * 100 : 0;

    const profitLoss = {
      period: {
        startDate,
        endDate,
        name: formatPeriodName(startDate, endDate)
      },
      revenue,
      cogs,
      grossProfit: {
        amount: grossProfit,
        margin: grossMargin
      },
      operatingExpenses,
      operatingIncome: {
        amount: operatingIncome,
        margin: operatingMargin
      },
      otherIncome,
      otherExpenses,
      netIncome: {
        amount: netIncome,
        margin: netMargin
      },
      summary: {
        totalRevenue: revenue.total,
        totalExpenses: cogs.total + operatingExpenses.total + otherExpenses.total,
        netProfit: netIncome,
        profitMargin: netMargin
      }
    };

    // Add comparison data if requested
    if (comparison !== 'none') {
      const comparisonPeriod = calculateComparisonPeriod(startDate, endDate, comparison);
      const comparisonData = await generateProfitLossComparison(companyId, comparisonPeriod);
      profitLoss.comparison = {
        period: comparisonPeriod,
        data: comparisonData,
        variance: calculateVariance(profitLoss, comparisonData)
      };
    }

    res.json({
      success: true,
      data: profitLoss
    });
  } catch (error) {
    console.error('Error generating P&L report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate profit & loss report'
    });
  }
});

/**
 * Balance Sheet
 */
router.get('/balance-sheet', [
  requireAdvancedReporting,
  query('asOfDate').isISO8601().withMessage('Valid as-of date required'),
  query('comparison').optional().isIn(['none', 'previous_month', 'previous_year']).withMessage('Invalid comparison type')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { asOfDate, comparison = 'none' } = req.query;
    const companyId = req.user.companyId;

    // Assets
    const currentAssets = await financialService.calculateCurrentAssets(companyId, asOfDate);
    const fixedAssets = await financialService.calculateFixedAssets(companyId, asOfDate);
    const totalAssets = currentAssets.total + fixedAssets.total;

    // Liabilities
    const currentLiabilities = await financialService.calculateCurrentLiabilities(companyId, asOfDate);
    const longTermLiabilities = await financialService.calculateLongTermLiabilities(companyId, asOfDate);
    const totalLiabilities = currentLiabilities.total + longTermLiabilities.total;

    // Equity
    const equity = await financialService.calculateEquity(companyId, asOfDate);
    const totalEquity = equity.total;

    // Verify balance (Assets = Liabilities + Equity)
    const balanceCheck = Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01;

    const balanceSheet = {
      asOfDate,
      assets: {
        current: currentAssets,
        fixed: fixedAssets,
        total: totalAssets
      },
      liabilities: {
        current: currentLiabilities,
        longTerm: longTermLiabilities,
        total: totalLiabilities
      },
      equity: {
        ...equity,
        total: totalEquity
      },
      totals: {
        assets: totalAssets,
        liabilitiesAndEquity: totalLiabilities + totalEquity,
        balanced: balanceCheck
      }
    };

    // Add comparison data if requested
    if (comparison !== 'none') {
      const comparisonDate = calculateComparisonDate(asOfDate, comparison);
      const comparisonData = await generateBalanceSheetComparison(companyId, comparisonDate);
      balanceSheet.comparison = {
        asOfDate: comparisonDate,
        data: comparisonData,
        variance: calculateBalanceSheetVariance(balanceSheet, comparisonData)
      };
    }

    res.json({
      success: true,
      data: balanceSheet
    });
  } catch (error) {
    console.error('Error generating balance sheet:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate balance sheet'
    });
  }
});

/**
 * Cash Flow Statement
 */
router.get('/cash-flow', [
  requireAdvancedReporting,
  query('startDate').isISO8601().withMessage('Valid start date required'),
  query('endDate').isISO8601().withMessage('Valid end date required'),
  query('method').optional().isIn(['direct', 'indirect']).withMessage('Invalid cash flow method')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { startDate, endDate, method = 'indirect' } = req.query;
    const companyId = req.user.companyId;

    // Operating Activities
    const operatingCashFlow = await financialService.calculateOperatingCashFlow(companyId, startDate, endDate, method);
    
    // Investing Activities
    const investingCashFlow = await financialService.calculateInvestingCashFlow(companyId, startDate, endDate);
    
    // Financing Activities
    const financingCashFlow = await financialService.calculateFinancingCashFlow(companyId, startDate, endDate);

    // Net Cash Flow
    const netCashFlow = operatingCashFlow.total + investingCashFlow.total + financingCashFlow.total;

    // Beginning and Ending Cash
    const beginningCash = await financialService.getCashBalance(companyId, startDate);
    const endingCash = beginningCash + netCashFlow;

    const cashFlow = {
      period: {
        startDate,
        endDate,
        name: formatPeriodName(startDate, endDate)
      },
      method,
      beginningCash,
      operating: operatingCashFlow,
      investing: investingCashFlow,
      financing: financingCashFlow,
      netCashFlow,
      endingCash,
      summary: {
        cashGenerated: Math.max(0, netCashFlow),
        cashUsed: Math.max(0, -netCashFlow),
        netChange: netCashFlow,
        endingBalance: endingCash
      }
    };

    res.json({
      success: true,
      data: cashFlow
    });
  } catch (error) {
    console.error('Error generating cash flow statement:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate cash flow statement'
    });
  }
});

/**
 * Trial Balance
 */
router.get('/trial-balance', [
  requireAdvancedReporting,
  query('asOfDate').isISO8601().withMessage('Valid as-of date required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { asOfDate } = req.query;
    const companyId = req.user.companyId;

    const trialBalance = await financialService.calculateTrialBalance(companyId, asOfDate);

    res.json({
      success: true,
      data: trialBalance
    });
  } catch (error) {
    console.error('Error generating trial balance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate trial balance'
    });
  }
});

/**
 * Financial Dashboard Summary
 */
router.get('/dashboard', async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const today = new Date();
    const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const currentYear = new Date(today.getFullYear(), 0, 1);
    const lastYear = new Date(today.getFullYear() - 1, 0, 1);

    // Key metrics
    const [
      currentMonthRevenue,
      lastMonthRevenue,
      currentYearRevenue,
      outstandingInvoices,
      overdueInvoices,
      recentExpenses,
      cashFlow,
      topCustomers,
      profitTrend
    ] = await Promise.all([
      financialService.calculateRevenue(companyId, currentMonth.toISOString(), today.toISOString()),
      financialService.calculateRevenue(companyId, lastMonth.toISOString(), currentMonth.toISOString()),
      financialService.calculateRevenue(companyId, currentYear.toISOString(), today.toISOString()),
      financialService.getOutstandingInvoices(companyId),
      financialService.getOverdueInvoices(companyId),
      financialService.getRecentExpenses(companyId, 30),
      financialService.getCashFlowTrend(companyId, 12),
      financialService.getTopCustomers(companyId, 10),
      financialService.getProfitTrend(companyId, 12)
    ]);

    const dashboard = {
      summary: {
        currentMonthRevenue: currentMonthRevenue.total,
        revenueGrowth: calculateGrowthRate(currentMonthRevenue.total, lastMonthRevenue.total),
        currentYearRevenue: currentYearRevenue.total,
        outstandingAmount: outstandingInvoices.total,
        overdueAmount: overdueInvoices.total,
        cashPosition: await financialService.getCurrentCashPosition(companyId)
      },
      trends: {
        revenue: await financialService.getRevenueTrend(companyId, 12),
        expenses: await financialService.getExpenseTrend(companyId, 12),
        profit: profitTrend,
        cashFlow: cashFlow
      },
      insights: {
        topCustomers,
        recentExpenses: recentExpenses.slice(0, 10),
        outstandingInvoices: outstandingInvoices.invoices.slice(0, 10),
        overdueInvoices: overdueInvoices.invoices.slice(0, 10)
      }
    };

    res.json({
      success: true,
      data: dashboard
    });
  } catch (error) {
    console.error('Error generating dashboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate dashboard'
    });
  }
});

/**
 * Export financial report
 */
router.post('/export', [
  requireAdvancedReporting,
  body('reportType').isIn(['profit-loss', 'balance-sheet', 'cash-flow', 'trial-balance']).withMessage('Invalid report type'),
  body('format').isIn(['pdf', 'excel', 'csv']).withMessage('Invalid export format'),
  body('parameters').isObject().withMessage('Report parameters required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { reportType, format, parameters } = req.body;
    const companyId = req.user.companyId;

    // Generate report data based on type
    let reportData;
    switch (reportType) {
      case 'profit-loss':
        reportData = await generateProfitLossForExport(companyId, parameters);
        break;
      case 'balance-sheet':
        reportData = await generateBalanceSheetForExport(companyId, parameters);
        break;
      case 'cash-flow':
        reportData = await generateCashFlowForExport(companyId, parameters);
        break;
      case 'trial-balance':
        reportData = await generateTrialBalanceForExport(companyId, parameters);
        break;
    }

    // Export in requested format
    let buffer, filename, contentType;
    switch (format) {
      case 'pdf':
        buffer = await exportToPDF(reportData, reportType);
        filename = `${reportType}-${Date.now()}.pdf`;
        contentType = 'application/pdf';
        break;
      case 'excel':
        buffer = await exportToExcel(reportData, reportType);
        filename = `${reportType}-${Date.now()}.xlsx`;
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        break;
      case 'csv':
        buffer = await exportToCSV(reportData, reportType);
        filename = `${reportType}-${Date.now()}.csv`;
        contentType = 'text/csv';
        break;
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (error) {
    console.error('Error exporting report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export report'
    });
  }
});

// Additional utility functions

function calculateGrowthRate(current, previous) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / Math.abs(previous)) * 100;
}

module.exports = router;
