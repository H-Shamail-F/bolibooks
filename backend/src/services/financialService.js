const { models, sequelize } = require('../database');
const { Op } = require('sequelize');

class FinancialService {
  /**
   * Calculate current assets for balance sheet
   */
  async calculateCurrentAssets(companyId, asOfDate) {
    const asOf = new Date(asOfDate);
    
    // Cash and cash equivalents (from payments and cash transactions)
    const cashBalance = await this.getCashBalance(companyId, asOfDate);
    
    // Accounts receivable (unpaid invoices)
    const receivables = await models.Invoice.sum('total', {
      where: {
        companyId,
        status: ['sent', 'overdue'],
        date: { [Op.lte]: asOf }
      }
    }) || 0;

    // Inventory value (products at cost price)
    const inventory = await models.Product.sum(
      sequelize.literal('quantity * costPrice'),
      {
        where: {
          companyId,
          isActive: true,
          createdAt: { [Op.lte]: asOf }
        }
      }
    ) || 0;

    // Prepaid expenses and other current assets
    const prepaidExpenses = await models.Expense.sum('amount', {
      where: {
        companyId,
        category: 'Prepaid',
        date: { [Op.lte]: asOf }
      }
    }) || 0;

    const breakdown = {
      cash: cashBalance,
      accountsReceivable: receivables,
      inventory: inventory,
      prepaidExpenses: prepaidExpenses,
      other: 0
    };

    return {
      breakdown,
      total: Object.values(breakdown).reduce((sum, val) => sum + val, 0)
    };
  }

  /**
   * Calculate fixed assets for balance sheet
   */
  async calculateFixedAssets(companyId, asOfDate) {
    // For now, return simplified fixed assets
    // In a full implementation, this would include equipment, buildings, etc.
    const breakdown = {
      equipment: 0,
      furniture: 0,
      buildings: 0,
      vehicles: 0,
      lessAccumulatedDepreciation: 0
    };

    return {
      breakdown,
      total: Object.values(breakdown).reduce((sum, val) => sum + val, 0)
    };
  }

  /**
   * Calculate current liabilities for balance sheet
   */
  async calculateCurrentLiabilities(companyId, asOfDate) {
    const asOf = new Date(asOfDate);

    // Accounts payable (unpaid expenses)
    const payables = await models.Expense.sum('amount', {
      where: {
        companyId,
        status: 'pending',
        date: { [Op.lte]: asOf }
      }
    }) || 0;

    // Accrued expenses
    const accruedExpenses = await models.Expense.sum('amount', {
      where: {
        companyId,
        category: 'Accrued',
        date: { [Op.lte]: asOf }
      }
    }) || 0;

    const breakdown = {
      accountsPayable: payables,
      accruedExpenses: accruedExpenses,
      shortTermDebt: 0,
      taxesPayable: 0,
      other: 0
    };

    return {
      breakdown,
      total: Object.values(breakdown).reduce((sum, val) => sum + val, 0)
    };
  }

  /**
   * Calculate long-term liabilities
   */
  async calculateLongTermLiabilities(companyId, asOfDate) {
    // For now, return simplified long-term liabilities
    const breakdown = {
      longTermDebt: 0,
      mortgages: 0,
      deferredTax: 0,
      other: 0
    };

    return {
      breakdown,
      total: Object.values(breakdown).reduce((sum, val) => sum + val, 0)
    };
  }

  /**
   * Calculate equity
   */
  async calculateEquity(companyId, asOfDate) {
    const asOf = new Date(asOfDate);

    // Calculate retained earnings (accumulated profits)
    const retainedEarnings = await this.calculateRetainedEarnings(companyId, asOf);

    const breakdown = {
      ownersEquity: 10000, // Initial capital - would be stored in database
      retainedEarnings: retainedEarnings,
      currentYearEarnings: 0 // Current year would be calculated separately
    };

    return {
      breakdown,
      total: Object.values(breakdown).reduce((sum, val) => sum + val, 0)
    };
  }

  /**
   * Calculate retained earnings
   */
  async calculateRetainedEarnings(companyId, asOfDate) {
    const startOfTime = new Date('2020-01-01'); // Company inception
    const endOfLastYear = new Date(new Date(asOfDate).getFullYear() - 1, 11, 31);

    if (endOfLastYear < startOfTime) return 0;

    // Calculate cumulative net income up to last year
    const revenue = await this.calculateRevenue(companyId, startOfTime.toISOString(), endOfLastYear.toISOString());
    const expenses = await this.calculateTotalExpenses(companyId, startOfTime.toISOString(), endOfLastYear.toISOString());
    
    return revenue.total - expenses.total;
  }

  /**
   * Calculate total expenses for a period
   */
  async calculateTotalExpenses(companyId, startDate, endDate) {
    const cogs = await this.calculateCOGS(companyId, startDate, endDate);
    const operating = await this.calculateOperatingExpenses(companyId, startDate, endDate);
    const other = await this.calculateOtherExpenses(companyId, startDate, endDate);

    return {
      total: cogs.total + operating.total + other.total,
      breakdown: {
        cogs: cogs.total,
        operating: operating.total,
        other: other.total
      }
    };
  }

  /**
   * Calculate operating cash flow
   */
  async calculateOperatingCashFlow(companyId, startDate, endDate, method = 'indirect') {
    if (method === 'direct') {
      return await this.calculateDirectCashFlow(companyId, startDate, endDate);
    } else {
      return await this.calculateIndirectCashFlow(companyId, startDate, endDate);
    }
  }

  /**
   * Calculate indirect cash flow (from net income)
   */
  async calculateIndirectCashFlow(companyId, startDate, endDate) {
    // Start with net income
    const revenue = await this.calculateRevenue(companyId, startDate, endDate);
    const expenses = await this.calculateTotalExpenses(companyId, startDate, endDate);
    const netIncome = revenue.total - expenses.total;

    // Adjustments for non-cash items
    const depreciation = 0; // Would be calculated from fixed assets
    const changesInWorkingCapital = await this.calculateWorkingCapitalChanges(companyId, startDate, endDate);

    const breakdown = {
      netIncome,
      depreciation,
      workingCapitalChanges: changesInWorkingCapital,
      other: 0
    };

    return {
      breakdown,
      total: netIncome + depreciation - changesInWorkingCapital,
      method: 'indirect'
    };
  }

  /**
   * Calculate direct cash flow
   */
  async calculateDirectCashFlow(companyId, startDate, endDate) {
    // Cash received from customers
    const cashFromCustomers = await models.Payment.sum('amount', {
      where: {
        companyId,
        date: { [Op.between]: [startDate, endDate] },
        type: 'inflow'
      }
    }) || 0;

    // Cash paid to suppliers
    const cashToSuppliers = await models.Payment.sum('amount', {
      where: {
        companyId,
        date: { [Op.between]: [startDate, endDate] },
        type: 'outflow',
        category: ['Suppliers', 'Inventory']
      }
    }) || 0;

    // Cash paid for operating expenses
    const cashForOperating = await models.Payment.sum('amount', {
      where: {
        companyId,
        date: { [Op.between]: [startDate, endDate] },
        type: 'outflow',
        category: { [Op.not]: ['Suppliers', 'Inventory', 'Capital', 'Loans'] }
      }
    }) || 0;

    const breakdown = {
      cashFromCustomers,
      cashToSuppliers: -cashToSuppliers,
      cashForOperating: -cashForOperating,
      other: 0
    };

    return {
      breakdown,
      total: cashFromCustomers - cashToSuppliers - cashForOperating,
      method: 'direct'
    };
  }

  /**
   * Calculate investing cash flow
   */
  async calculateInvestingCashFlow(companyId, startDate, endDate) {
    // Purchase of equipment, investments, etc.
    const capitalExpenditures = await models.Expense.sum('amount', {
      where: {
        companyId,
        date: { [Op.between]: [startDate, endDate] },
        category: 'Capital Equipment'
      }
    }) || 0;

    const breakdown = {
      capitalExpenditures: -capitalExpenditures,
      investments: 0,
      disposals: 0,
      other: 0
    };

    return {
      breakdown,
      total: -capitalExpenditures
    };
  }

  /**
   * Calculate financing cash flow
   */
  async calculateFinancingCashFlow(companyId, startDate, endDate) {
    // Loans, equity, distributions
    const loanProceeds = await models.Payment.sum('amount', {
      where: {
        companyId,
        date: { [Op.between]: [startDate, endDate] },
        type: 'inflow',
        category: 'Loans'
      }
    }) || 0;

    const loanPayments = await models.Payment.sum('amount', {
      where: {
        companyId,
        date: { [Op.between]: [startDate, endDate] },
        type: 'outflow',
        category: 'Loan Payments'
      }
    }) || 0;

    const breakdown = {
      loanProceeds,
      loanPayments: -loanPayments,
      equityInvestments: 0,
      distributions: 0,
      other: 0
    };

    return {
      breakdown,
      total: loanProceeds - loanPayments
    };
  }

  /**
   * Calculate working capital changes
   */
  async calculateWorkingCapitalChanges(companyId, startDate, endDate) {
    // Simplified calculation - changes in receivables and payables
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Beginning working capital
    const beginningReceivables = await models.Invoice.sum('total', {
      where: {
        companyId,
        status: ['sent', 'overdue'],
        date: { [Op.lt]: start }
      }
    }) || 0;

    // Ending working capital
    const endingReceivables = await models.Invoice.sum('total', {
      where: {
        companyId,
        status: ['sent', 'overdue'],
        date: { [Op.lte]: end }
      }
    }) || 0;

    return endingReceivables - beginningReceivables;
  }

  /**
   * Get cash balance at a specific date
   */
  async getCashBalance(companyId, date) {
    const inflows = await models.Payment.sum('amount', {
      where: {
        companyId,
        type: 'inflow',
        date: { [Op.lte]: date }
      }
    }) || 0;

    const outflows = await models.Payment.sum('amount', {
      where: {
        companyId,
        type: 'outflow',
        date: { [Op.lte]: date }
      }
    }) || 0;

    return inflows - outflows;
  }

  /**
   * Calculate trial balance
   */
  async calculateTrialBalance(companyId, asOfDate) {
    const accounts = [];
    
    // Assets
    const currentAssets = await this.calculateCurrentAssets(companyId, asOfDate);
    const fixedAssets = await this.calculateFixedAssets(companyId, asOfDate);
    
    // Add asset accounts
    Object.entries(currentAssets.breakdown).forEach(([name, amount]) => {
      if (amount !== 0) {
        accounts.push({
          accountName: `Current Assets - ${name}`,
          accountType: 'Asset',
          debit: amount,
          credit: 0
        });
      }
    });

    Object.entries(fixedAssets.breakdown).forEach(([name, amount]) => {
      if (amount !== 0) {
        accounts.push({
          accountName: `Fixed Assets - ${name}`,
          accountType: 'Asset',
          debit: amount,
          credit: 0
        });
      }
    });

    // Liabilities
    const currentLiabilities = await this.calculateCurrentLiabilities(companyId, asOfDate);
    const longTermLiabilities = await this.calculateLongTermLiabilities(companyId, asOfDate);
    
    Object.entries(currentLiabilities.breakdown).forEach(([name, amount]) => {
      if (amount !== 0) {
        accounts.push({
          accountName: `Current Liabilities - ${name}`,
          accountType: 'Liability',
          debit: 0,
          credit: amount
        });
      }
    });

    Object.entries(longTermLiabilities.breakdown).forEach(([name, amount]) => {
      if (amount !== 0) {
        accounts.push({
          accountName: `Long-term Liabilities - ${name}`,
          accountType: 'Liability',
          debit: 0,
          credit: amount
        });
      }
    });

    // Equity
    const equity = await this.calculateEquity(companyId, asOfDate);
    Object.entries(equity.breakdown).forEach(([name, amount]) => {
      if (amount !== 0) {
        accounts.push({
          accountName: `Equity - ${name}`,
          accountType: 'Equity',
          debit: 0,
          credit: amount
        });
      }
    });

    // Calculate totals
    const totalDebits = accounts.reduce((sum, acc) => sum + acc.debit, 0);
    const totalCredits = accounts.reduce((sum, acc) => sum + acc.credit, 0);
    const balanced = Math.abs(totalDebits - totalCredits) < 0.01;

    return {
      asOfDate,
      accounts,
      totals: {
        debits: totalDebits,
        credits: totalCredits,
        balanced
      }
    };
  }

  /**
   * Get outstanding invoices
   */
  async getOutstandingInvoices(companyId) {
    const invoices = await models.Invoice.findAll({
      where: {
        companyId,
        status: ['sent', 'overdue']
      },
      include: [{
        model: models.Customer,
        attributes: ['name']
      }],
      order: [['dueDate', 'ASC']]
    });

    const total = invoices.reduce((sum, inv) => sum + inv.total, 0);

    return {
      total,
      count: invoices.length,
      invoices: invoices.map(inv => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        customerName: inv.Customer?.name,
        amount: inv.total,
        dueDate: inv.dueDate,
        daysOutstanding: Math.floor((new Date() - new Date(inv.dueDate)) / (1000 * 60 * 60 * 24))
      }))
    };
  }

  /**
   * Get overdue invoices
   */
  async getOverdueInvoices(companyId) {
    const today = new Date();
    const invoices = await models.Invoice.findAll({
      where: {
        companyId,
        status: ['sent', 'overdue'],
        dueDate: { [Op.lt]: today }
      },
      include: [{
        model: models.Customer,
        attributes: ['name']
      }],
      order: [['dueDate', 'ASC']]
    });

    const total = invoices.reduce((sum, inv) => sum + inv.total, 0);

    return {
      total,
      count: invoices.length,
      invoices: invoices.map(inv => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        customerName: inv.Customer?.name,
        amount: inv.total,
        dueDate: inv.dueDate,
        daysOverdue: Math.floor((today - new Date(inv.dueDate)) / (1000 * 60 * 60 * 24))
      }))
    };
  }

  /**
   * Get recent expenses
   */
  async getRecentExpenses(companyId, days = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const expenses = await models.Expense.findAll({
      where: {
        companyId,
        date: { [Op.gte]: cutoffDate }
      },
      order: [['date', 'DESC']],
      limit: 50
    });

    return expenses.map(exp => ({
      id: exp.id,
      description: exp.description,
      category: exp.category,
      amount: exp.amount,
      date: exp.date
    }));
  }

  /**
   * Get cash flow trend
   */
  async getCashFlowTrend(companyId, months = 12) {
    const trends = [];
    const today = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const monthStart = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthEnd = new Date(today.getFullYear(), today.getMonth() - i + 1, 0);

      const cashFlow = await this.calculateOperatingCashFlow(
        companyId, 
        monthStart.toISOString(), 
        monthEnd.toISOString()
      );

      trends.push({
        period: monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        cashFlow: cashFlow.total,
        month: monthStart.getMonth() + 1,
        year: monthStart.getFullYear()
      });
    }

    return trends;
  }

  /**
   * Get top customers by revenue
   */
  async getTopCustomers(companyId, limit = 10) {
    const customers = await models.Customer.findAll({
      where: { companyId },
      include: [{
        model: models.Invoice,
        where: { status: 'paid' },
        required: false
      }],
      order: [[sequelize.literal('(SELECT SUM(total) FROM invoices WHERE invoices.customerId = Customer.id AND invoices.status = "paid")'), 'DESC']],
      limit
    });

    return customers.map(customer => {
      const totalRevenue = customer.Invoices.reduce((sum, inv) => sum + inv.total, 0);
      return {
        id: customer.id,
        name: customer.name,
        totalRevenue,
        invoiceCount: customer.Invoices.length,
        averageInvoice: customer.Invoices.length > 0 ? totalRevenue / customer.Invoices.length : 0
      };
    });
  }

  /**
   * Get profit trend
   */
  async getProfitTrend(companyId, months = 12) {
    const trends = [];
    const today = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const monthStart = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthEnd = new Date(today.getFullYear(), today.getMonth() - i + 1, 0);

      const revenue = await this.calculateRevenue(
        companyId, 
        monthStart.toISOString(), 
        monthEnd.toISOString()
      );

      const expenses = await this.calculateTotalExpenses(
        companyId,
        monthStart.toISOString(),
        monthEnd.toISOString()
      );

      const profit = revenue.total - expenses.total;
      const margin = revenue.total > 0 ? (profit / revenue.total) * 100 : 0;

      trends.push({
        period: monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        revenue: revenue.total,
        expenses: expenses.total,
        profit,
        margin,
        month: monthStart.getMonth() + 1,
        year: monthStart.getFullYear()
      });
    }

    return trends;
  }

  /**
   * Get revenue trend
   */
  async getRevenueTrend(companyId, months = 12) {
    const trends = [];
    const today = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const monthStart = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthEnd = new Date(today.getFullYear(), today.getMonth() - i + 1, 0);

      const revenue = await this.calculateRevenue(
        companyId, 
        monthStart.toISOString(), 
        monthEnd.toISOString()
      );

      trends.push({
        period: monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        amount: revenue.total,
        count: revenue.count,
        month: monthStart.getMonth() + 1,
        year: monthStart.getFullYear()
      });
    }

    return trends;
  }

  /**
   * Get expense trend
   */
  async getExpenseTrend(companyId, months = 12) {
    const trends = [];
    const today = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const monthStart = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthEnd = new Date(today.getFullYear(), today.getMonth() - i + 1, 0);

      const expenses = await this.calculateTotalExpenses(
        companyId,
        monthStart.toISOString(),
        monthEnd.toISOString()
      );

      trends.push({
        period: monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        amount: expenses.total,
        breakdown: expenses.breakdown,
        month: monthStart.getMonth() + 1,
        year: monthStart.getFullYear()
      });
    }

    return trends;
  }

  /**
   * Get current cash position
   */
  async getCurrentCashPosition(companyId) {
    return await this.getCashBalance(companyId, new Date().toISOString());
  }

  // Include the existing calculateRevenue, calculateCOGS, and calculateOperatingExpenses methods
  async calculateRevenue(companyId, startDate, endDate) {
    const invoices = await models.Invoice.findAll({
      where: {
        companyId,
        date: {
          [Op.between]: [startDate, endDate]
        },
        status: 'paid'
      },
      attributes: ['total', 'subTotal', 'taxAmount', 'date']
    });

    const breakdown = {
      sales: 0,
      services: 0,
      other: 0
    };

    const total = invoices.reduce((sum, invoice) => {
      breakdown.sales += invoice.subTotal; // Simplification
      return sum + invoice.total;
    }, 0);

    return {
      total,
      breakdown,
      count: invoices.length,
      average: invoices.length > 0 ? total / invoices.length : 0
    };
  }

  async calculateCOGS(companyId, startDate, endDate) {
    const salesData = await models.Invoice.findAll({
      where: {
        companyId,
        date: {
          [Op.between]: [startDate, endDate]
        },
        status: 'paid'
      },
      include: [{
        model: models.InvoiceItem,
        include: [{
          model: models.Product,
          attributes: ['costPrice']
        }]
      }]
    });

    let total = 0;
    const breakdown = {
      materials: 0,
      labor: 0,
      overhead: 0
    };

    salesData.forEach(invoice => {
      invoice.InvoiceItems?.forEach(item => {
        const cost = (item.Product?.costPrice || 0) * item.quantity;
        total += cost;
        breakdown.materials += cost; // Simplification
      });
    });

    return {
      total,
      breakdown,
      margin: total > 0 ? ((await this.calculateRevenue(companyId, startDate, endDate)).total - total) / total * 100 : 0
    };
  }

  async calculateOperatingExpenses(companyId, startDate, endDate) {
    const expenses = await models.Expense.findAll({
      where: {
        companyId,
        date: {
          [Op.between]: [startDate, endDate]
        }
      },
      attributes: ['amount', 'category', 'date']
    });

    const breakdown = {};
    const total = expenses.reduce((sum, expense) => {
      const category = expense.category || 'Other';
      if (!breakdown[category]) {
        breakdown[category] = 0;
      }
      breakdown[category] += expense.amount;
      return sum + expense.amount;
    }, 0);

    return {
      total,
      breakdown,
      count: expenses.length
    };
  }

  async calculateOtherExpenses(companyId, startDate, endDate) {
    // This would include interest expenses, investment losses, etc.
    // For now, return zero as it requires additional data structure
    return {
      total: 0,
      breakdown: {
        interest: 0,
        investments: 0,
        other: 0
      }
    };
  }
}

module.exports = new FinancialService();
