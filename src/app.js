const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const errorHandler = require('./middlewares/errorHandler');

// Import routes
const authRoutes = require('./routes/auth');
const addressRoutes = require('./routes/addresses');
const statsRoutes = require('./routes/stats');
const servicesRoutes = require('./routes/services');
const customerRoutes = require('./routes/customer/customerRoutes');
const adminRoutes = require('./routes/admin/adminRoutes');
const branchRoutes = require('./routes/branch/branchRoutes');
const supportRoutes = require('./routes/support/supportRoutes');
const centerAdminAuthRoutes = require('./routes/centerAdminAuth');
const centerAdminDashboardRoutes = require('./routes/centerAdminDashboard');
const centerAdminBranchRoutes = require('./routes/centerAdminBranches');
const centerAdminRoleRoutes = require('./routes/centerAdminRoles');
const centerAdminPricingRoutes = require('./routes/centerAdminPricing');
const centerAdminFinancialRoutes = require('./routes/centerAdminFinancial');
const centerAdminRiskRoutes = require('./routes/centerAdminRisk');
const centerAdminAnalyticsRoutes = require('./routes/centerAdminAnalytics');
const centerAdminSettingsRoutes = require('./routes/centerAdminSettings');
const centerAdminAuditRoutes = require('./routes/centerAdminAudit');
const centerAdminLogisticsRoutes = require('./routes/centerAdminLogistics');
const centerAdminOrdersRoutes = require('./routes/centerAdminOrders');
const centerAdminUsersRoutes = require('./routes/centerAdminUsers');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors());

// Rate limiting (relaxed for development)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // increased limit for development
  message: 'Too many requests from this IP, please try again later.'
});

// Only apply rate limiting in production
if (process.env.NODE_ENV === 'production') {
  app.use('/api/', limiter);
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Laundry Management API is running',
    timestamp: new Date().toISOString()
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/customer', customerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/branch', branchRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/center-admin/auth', centerAdminAuthRoutes);
app.use('/api/center-admin/dashboard', centerAdminDashboardRoutes);
app.use('/api/center-admin/branches', centerAdminBranchRoutes);
app.use('/api/center-admin/roles', centerAdminRoleRoutes);
app.use('/api/center-admin/pricing', centerAdminPricingRoutes);
app.use('/api/center-admin/financial', centerAdminFinancialRoutes);
app.use('/api/center-admin/risk', centerAdminRiskRoutes);
app.use('/api/center-admin/analytics', centerAdminAnalyticsRoutes);
app.use('/api/center-admin/settings', centerAdminSettingsRoutes);
app.use('/api/center-admin/audit', centerAdminAuditRoutes);
app.use('/api/center-admin/logistics', centerAdminLogisticsRoutes);
app.use('/api/center-admin/orders', centerAdminOrdersRoutes);
app.use('/api/center-admin/users', centerAdminUsersRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'ROUTE_NOT_FOUND',
    message: `Route ${req.originalUrl} not found`
  });
});

// Global error handler
app.use(errorHandler);

module.exports = app;