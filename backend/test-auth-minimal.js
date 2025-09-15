const express = require('express');
const { authMiddleware } = require('./src/middleware/auth');

const app = express();
app.use(express.json());

app.get('/api/test/auth', authMiddleware, (req, res) => {
  res.json({
    success: true,
    user: req.user,
    message: 'Authentication working'
  });
});

app.get('/api/test/simple', (req, res) => {
  res.json({
    success: true,
    message: 'Simple endpoint working',
    timestamp: new Date().toISOString()
  });
});

app.listen(5002, () => {
  console.log('Minimal test server running on port 5002');
});
