const express = require('express')
const { body, query, param } = require('express-validator')
const { authenticateCenterAdmin } = require('../middlewares/centerAdminAuthSimple')
const centerAdminAnalyticsController = require('../controllers/centerAdminAnalyticsController')

const router = express.Router()

// Apply center admin authentication to all routes
router.use(authenticateCenterAdmin)

// Validation rules
const generateRetentionAnalysisValidation = [
  body('startDate')
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  body('endDate')
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date')
    .custom((endDate, { req }) => {
      if (new Date(endDate) <= new Date(req.body.startDate)) {
        throw new Error('End date must be after start date')
      }
      return true
    }),
  body('filters')
    .optional()
    .isObject()
    .withMessage('Filters must be an object')
]

const generateBranchAnalysisValidation = [
  body('startDate')
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  body('endDate')
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date')
    .custom((endDate, { req }) => {
      if (new Date(endDate) <= new Date(req.body.startDate)) {
        throw new Error('End date must be after start date')
      }
      return true
    }),
  body('filters')
    .optional()
    .isObject()
    .withMessage('Filters must be an object'),
  body('filters.branchIds')
    .optional()
    .isArray()
    .withMessage('Branch IDs must be an array')
]

const generateRevenueForecastValidation = [
  body('startDate')
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  body('endDate')
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date')
    .custom((endDate, { req }) => {
      if (new Date(endDate) <= new Date(req.body.startDate)) {
        throw new Error('End date must be after start date')
      }
      return true
    }),
  body('forecastHorizon')
    .optional()
    .isInt({ min: 1, max: 36 })
    .withMessage('Forecast horizon must be between 1 and 36 months'),
  body('methodology')
    .optional()
    .isIn(['linear_regression', 'exponential_smoothing', 'arima'])
    .withMessage('Invalid forecasting methodology'),
  body('filters')
    .optional()
    .isObject()
    .withMessage('Filters must be an object')
]

const generateExpansionAnalysisValidation = [
  body('targetLocation')
    .isObject()
    .withMessage('Target location must be an object'),
  body('targetLocation.city')
    .notEmpty()
    .withMessage('Target city is required'),
  body('targetLocation.area')
    .optional()
    .isString()
    .withMessage('Area must be a string'),
  body('targetLocation.pincode')
    .optional()
    .isString()
    .withMessage('Pincode must be a string'),
  body('marketData')
    .isObject()
    .withMessage('Market data must be an object'),
  body('marketData.populationDensity')
    .optional()
    .isNumeric()
    .withMessage('Population density must be a number'),
  body('marketData.averageIncome')
    .optional()
    .isNumeric()
    .withMessage('Average income must be a number'),
  body('marketData.competitorCount')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Competitor count must be a non-negative integer'),
  body('marketData.demandEstimate')
    .optional()
    .isNumeric()
    .withMessage('Demand estimate must be a number')
]

const getAnalyticsValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('type')
    .optional()
    .isIn([
      'customer_retention',
      'revenue_forecast',
      'branch_performance',
      'market_analysis',
      'cohort_analysis',
      'churn_prediction',
      'demand_forecast',
      'expansion_analysis',
      'competitive_analysis',
      'seasonal_analysis'
    ])
    .withMessage('Invalid analytics type'),
  query('status')
    .optional()
    .isIn(['generating', 'completed', 'failed', 'scheduled'])
    .withMessage('Invalid status'),
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date'),
  query('sortBy')
    .optional()
    .isIn(['createdAt', 'type', 'status', 'analyticsId'])
    .withMessage('Invalid sort field'),
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc')
]

// Routes

// GET /api/center-admin/analytics/overview - Get analytics dashboard overview
router.get('/overview', 
  query('timeframe')
    .optional()
    .isIn(['7d', '30d', '90d', '1y'])
    .withMessage('Invalid timeframe'),
  centerAdminAnalyticsController.getAnalyticsOverview
)

// POST /api/center-admin/analytics/customer-retention - Generate customer retention analysis
router.post('/customer-retention', 
  generateRetentionAnalysisValidation,
  centerAdminAnalyticsController.generateCustomerRetentionAnalysis
)

// POST /api/center-admin/analytics/branch-performance - Generate branch performance analysis
router.post('/branch-performance', 
  generateBranchAnalysisValidation,
  centerAdminAnalyticsController.generateBranchPerformanceAnalysis
)

// POST /api/center-admin/analytics/revenue-forecast - Generate revenue forecast
router.post('/revenue-forecast', 
  generateRevenueForecastValidation,
  centerAdminAnalyticsController.generateRevenueForecast
)

// POST /api/center-admin/analytics/expansion-analysis - Generate expansion analysis
router.post('/expansion-analysis', 
  generateExpansionAnalysisValidation,
  centerAdminAnalyticsController.generateExpansionAnalysis
)

// GET /api/center-admin/analytics - Get all analytics
router.get('/', 
  getAnalyticsValidation,
  centerAdminAnalyticsController.getAnalytics
)

// GET /api/center-admin/analytics/:analyticsId - Get single analytics
router.get('/:analyticsId', 
  param('analyticsId')
    .isMongoId()
    .withMessage('Invalid analytics ID'),
  centerAdminAnalyticsController.getAnalyticsById
)

module.exports = router