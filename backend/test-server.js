const express = require('express');
require('dotenv').config();

const { initializeDatabase } = require('./src/database');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Test server is running',
    timestamp: new Date().toISOString()
  });
});

// Test auth route separately
try {
  const authRoutes = require('./src/routes/auth');
  app.use('/api/auth', authRoutes);
  console.log('✅ Auth routes loaded');
} catch (error) {
  console.error('❌ Auth routes failed:', error.message);
}

async function startServer() {
  try {
    console.log('🔄 Initializing database...');
    await initializeDatabase();
    console.log('✅ Database initialized');
    
    const server = app.listen(PORT, () => {
      console.log(`🚀 Test server running on port ${PORT}`);
    });
    
    // Keep server alive
    process.on('SIGTERM', () => {
      console.log('🛑 Shutting down server...');
      server.close(() => {
        console.log('✅ Server shut down');
        process.exit(0);
      });
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
