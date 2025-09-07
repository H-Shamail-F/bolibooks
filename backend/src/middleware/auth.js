const jwt = require('jsonwebtoken');
const { models } = require('../database');

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user with company information
    const user = await models.User.findOne({
      where: { id: decoded.id, isActive: true },
      include: [{ model: models.Company, attributes: ['id', 'name', 'subscriptionStatus'] }]
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid token. User not found.' });
    }

    // Check if company subscription is active
    if (user.Company?.subscriptionStatus === 'suspended') {
      return res.status(403).json({ error: 'Company subscription is suspended.' });
    }

    req.user = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      companyId: user.companyId,
      company: user.Company
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token.' });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired.' });
    }
    
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

// Middleware to check for specific roles
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
    }
    next();
  };
};

// Middleware for company owners only
const requireOwner = requireRole(['owner']);

// Middleware for admins and owners
const requireAdmin = requireRole(['owner', 'admin']);

module.exports = {
  authMiddleware,
  requireRole,
  requireOwner,
  requireAdmin
};
