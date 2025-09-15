const express = require('express');
const { models, initializeDatabase } = require('./src/database');
const { authMiddleware } = require('./src/middleware/auth');

const app = express();
app.use(express.json());

// Initialize database
initializeDatabase();

// Simple test endpoint
app.get('/api/test/dashboard', authMiddleware, async (req, res) => {
  try {
    console.log('Test dashboard endpoint called');
    console.log('User:', req.user);
    
    const companyId = req.user.companyId;
    
    // Simple counts without complex queries
    const totalProducts = await models.Product.count({ 
      where: { companyId, isActive: true } 
    });
    
    const totalCustomers = await models.Customer.count({ 
      where: { companyId, isActive: true } 
    });
    
    // Test POS sales sum
    let totalRevenue = 0;
    try {
      const sales = await models.POSSale.findAll({
        where: { companyId, status: 'completed' },
        attributes: ['total'],
        raw: true
      });
      
      totalRevenue = sales.reduce((sum, sale) => sum + parseFloat(sale.total || 0), 0);
    } catch (error) {
      console.error('Error calculating revenue:', error);
    }
    
    res.json({
      success: true,
      data: {
        totalProducts,
        totalCustomers,
        totalRevenue,
        companyId,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Test endpoint error:', error);
    res.status(500).json({ 
      error: 'Test endpoint failed', 
      message: error.message,
      stack: error.stack 
    });
  }
});

const PORT = 5001;
app.listen(PORT, () => {
  console.log(`Test API server running on port ${PORT}`);
});
