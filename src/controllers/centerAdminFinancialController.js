const Transaction = require('../models/Transaction')
const Settlement = require('../models/Settlement')
const FinancialReport = require('../models/FinancialReport')
const Order = require('../models/Order')
const AuditLog = require('../models/AuditLog')
const { validationResult } = require('express-validator')

class CenterAdminFinancialController {
  // Get financial dashboard overview
  async getFinancialOverview(req, res) {
    try {
      const { timeframe = '30d' } = req.query
      
      // Calculate date range
      const endDate = new Date()
      const startDate = new Date()
      
      switch (timeframe) {
        case '7d':
          startDate.setDate(endDate.getDate() - 7)
          break
        case '30d':
          startDate.setDate(endDate.getDate() - 30)
          break
        case '90d':
          startDate.setDate(endDate.getDate() - 90)
          break
        case '1y':
          startDate.setFullYear(endDate.getFullYear() - 1)
          break
        default:
          startDate.setDate(endDate.getDate() - 30)
      }

      // Get transaction stats
      const transactionStats = await Transaction.getTransactionStats({
        createdAt: { $gte: startDate, $lte: endDate },
        status: 'completed'
      })

      // Get settlement stats
      const settlementStats = await Settlement.getSettlementStats({
        createdAt: { $gte: startDate, $lte: endDate }
      })

      // Get pending approvals
      const pendingTransactions = await Transaction.getPendingApprovals()
      const pendingSettlements = await Settlement.getPendingApprovals()

      // Get revenue trend
      const revenueTrend = await Transaction.getRevenueByPeriod(
        startDate, 
        endDate, 
        timeframe === '7d' ? 'day' : timeframe === '30d' ? 'day' : 'week'
      )

      // Calculate growth metrics
      const previousStartDate = new Date(startDate)
      previousStartDate.setTime(startDate.getTime() - (endDate.getTime() - startDate.getTime()))
      
      const previousStats = await Transaction.getTransactionStats({
        createdAt: { $gte: previousStartDate, $lte: startDate },
        status: 'completed'
      })

      const revenueGrowth = previousStats.totalNetAmount > 0 
        ? ((transactionStats.totalNetAmount - previousStats.totalNetAmount) / previousStats.totalNetAmount) * 100
        : 0

      return res.json({
        success: true,
        data: {
          overview: {
            totalRevenue: transactionStats.totalNetAmount,
            totalTransactions: transactionStats.totalTransactions,
            averageOrderValue: transactionStats.avgTransactionAmount,
            totalFees: transactionStats.totalFees,
            revenueGrowth,
            settlementStats,
            pendingApprovals: {
              transactions: pendingTransactions.length,
              settlements: pendingSettlements.length,
              totalAmount: pendingTransactions.reduce((sum, t) => sum + t.amount, 0) +
                          pendingSettlements.reduce((sum, s) => sum + s.netAmount, 0)
            }
          },
          revenueTrend,
          timeframe
        }
      })
    } catch (error) {
      console.error('Get financial overview error:', error)
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch financial overview'
      })
    }
  }

  // Get all transactions with filters
  async getTransactions(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        type,
        status,
        startDate,
        endDate,
        branchId,
        customerId,
        minAmount,
        maxAmount,
        paymentMethod,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query

      // Build query
      const query = {}
      
      if (type) query.type = type
      if (status) query.status = status
      if (branchId) query.branchId = branchId
      if (customerId) query.customerId = customerId
      if (paymentMethod) query.paymentMethod = paymentMethod
      
      if (startDate || endDate) {
        query.createdAt = {}
        if (startDate) query.createdAt.$gte = new Date(startDate)
        if (endDate) query.createdAt.$lte = new Date(endDate)
      }
      
      if (minAmount || maxAmount) {
        query.amount = {}
        if (minAmount) query.amount.$gte = parseFloat(minAmount)
        if (maxAmount) query.amount.$lte = parseFloat(maxAmount)
      }
      
      if (search) {
        query.$or = [
          { transactionId: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { externalTransactionId: { $regex: search, $options: 'i' } }
        ]
      }

      // Execute query
      const transactions = await Transaction.find(query)
        .populate('customerId', 'name email phone')
        .populate('branchId', 'name location')
        .populate('orderId', 'orderNumber')
        .populate('approvedBy', 'name email')
        .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .lean()

      const total = await Transaction.countDocuments(query)

      return res.json({
        success: true,
        data: {
          transactions,
          pagination: {
            current: parseInt(page),
            pages: Math.ceil(total / limit),
            total,
            limit: parseInt(limit)
          }
        }
      })
    } catch (error) {
      console.error('Get transactions error:', error)
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch transactions'
      })
    }
  }

  // Get single transaction
  async getTransaction(req, res) {
    try {
      const { transactionId } = req.params

      const transaction = await Transaction.findById(transactionId)
        .populate('customerId', 'name email phone')
        .populate('branchId', 'name location')
        .populate('orderId', 'orderNumber items')
        .populate('approvedBy', 'name email')
        .populate('createdBy', 'name email')

      if (!transaction) {
        return res.status(404).json({
          success: false,
          message: 'Transaction not found'
        })
      }

      return res.json({
        success: true,
        data: { transaction }
      })
    } catch (error) {
      console.error('Get transaction error:', error)
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch transaction'
      })
    }
  }

  // Approve refund
  async approveRefund(req, res) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        })
      }

      const { transactionId } = req.params
      const { notes } = req.body

      const transaction = await Transaction.findById(transactionId)
      if (!transaction) {
        return res.status(404).json({
          success: false,
          message: 'Transaction not found'
        })
      }

      if (transaction.type !== 'refund') {
        return res.status(400).json({
          success: false,
          message: 'Transaction is not a refund'
        })
      }

      if (transaction.approvalStatus !== 'pending') {
        return res.status(400).json({
          success: false,
          message: 'Transaction is not pending approval'
        })
      }

      // Approve the refund
      await transaction.approve(req.admin._id, notes)

      // Log the approval
      await AuditLog.logAction({
        userId: req.admin._id,
        userType: 'center_admin',
        userEmail: req.admin.email,
        action: 'approve_refund',
        category: 'financial',
        description: `Approved refund of ₹${transaction.amount} for transaction ${transaction.transactionId}`,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        sessionId: req.sessionId,
        resourceType: 'transaction',
        resourceId: transaction._id.toString(),
        status: 'success',
        riskLevel: 'high',
        metadata: {
          transactionId: transaction.transactionId,
          amount: transaction.amount,
          notes
        }
      })

      return res.json({
        success: true,
        message: 'Refund approved successfully',
        data: { transaction }
      })
    } catch (error) {
      console.error('Approve refund error:', error)
      return res.status(500).json({
        success: false,
        message: 'Failed to approve refund'
      })
    }
  }

  // Reject refund
  async rejectRefund(req, res) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        })
      }

      const { transactionId } = req.params
      const { reason } = req.body

      const transaction = await Transaction.findById(transactionId)
      if (!transaction) {
        return res.status(404).json({
          success: false,
          message: 'Transaction not found'
        })
      }

      if (transaction.type !== 'refund') {
        return res.status(400).json({
          success: false,
          message: 'Transaction is not a refund'
        })
      }

      if (transaction.approvalStatus !== 'pending') {
        return res.status(400).json({
          success: false,
          message: 'Transaction is not pending approval'
        })
      }

      // Reject the refund
      await transaction.reject(req.admin._id, reason)

      // Log the rejection
      await AuditLog.logAction({
        userId: req.admin._id,
        userType: 'center_admin',
        userEmail: req.admin.email,
        action: 'reject_refund',
        category: 'financial',
        description: `Rejected refund of ₹${transaction.amount} for transaction ${transaction.transactionId}`,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        sessionId: req.sessionId,
        resourceType: 'transaction',
        resourceId: transaction._id.toString(),
        status: 'success',
        riskLevel: 'medium',
        metadata: {
          transactionId: transaction.transactionId,
          amount: transaction.amount,
          reason
        }
      })

      return res.json({
        success: true,
        message: 'Refund rejected successfully',
        data: { transaction }
      })
    } catch (error) {
      console.error('Reject refund error:', error)
      return res.status(500).json({
        success: false,
        message: 'Failed to reject refund'
      })
    }
  }

  // Get all settlements
  async getSettlements(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        type,
        status,
        startDate,
        endDate,
        recipientId,
        minAmount,
        maxAmount,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query

      // Build query
      const query = {}
      
      if (type) query.type = type
      if (status) query.status = status
      if (recipientId) query.recipientId = recipientId
      
      if (startDate || endDate) {
        query.createdAt = {}
        if (startDate) query.createdAt.$gte = new Date(startDate)
        if (endDate) query.createdAt.$lte = new Date(endDate)
      }
      
      if (minAmount || maxAmount) {
        query.netAmount = {}
        if (minAmount) query.netAmount.$gte = parseFloat(minAmount)
        if (maxAmount) query.netAmount.$lte = parseFloat(maxAmount)
      }
      
      if (search) {
        query.$or = [
          { settlementId: { $regex: search, $options: 'i' } },
          { recipientName: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ]
      }

      // Execute query
      const settlements = await Settlement.find(query)
        .populate('recipientId')
        .populate('createdBy', 'name email')
        .populate('approvals.approvedBy', 'name email')
        .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .lean()

      const total = await Settlement.countDocuments(query)

      return res.json({
        success: true,
        data: {
          settlements,
          pagination: {
            current: parseInt(page),
            pages: Math.ceil(total / limit),
            total,
            limit: parseInt(limit)
          }
        }
      })
    } catch (error) {
      console.error('Get settlements error:', error)
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch settlements'
      })
    }
  }

  // Create settlement
  async createSettlement(req, res) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        })
      }

      const settlementData = {
        ...req.body,
        createdBy: req.admin._id
      }

      const settlement = new Settlement(settlementData)
      await settlement.save()

      // Log the creation
      await AuditLog.logAction({
        userId: req.admin._id,
        userType: 'center_admin',
        userEmail: req.admin.email,
        action: 'create_settlement',
        category: 'financial',
        description: `Created settlement ${settlement.settlementId} for ₹${settlement.netAmount}`,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        sessionId: req.sessionId,
        resourceType: 'settlement',
        resourceId: settlement._id.toString(),
        status: 'success',
        riskLevel: 'medium',
        metadata: {
          settlementId: settlement.settlementId,
          type: settlement.type,
          amount: settlement.netAmount,
          recipientName: settlement.recipientName
        }
      })

      return res.status(201).json({
        success: true,
        message: 'Settlement created successfully',
        data: { settlement }
      })
    } catch (error) {
      console.error('Create settlement error:', error)
      return res.status(500).json({
        success: false,
        message: 'Failed to create settlement'
      })
    }
  }

  // Approve settlement
  async approveSettlement(req, res) {
    try {
      const { settlementId } = req.params
      const { comments } = req.body

      const settlement = await Settlement.findById(settlementId)
      if (!settlement) {
        return res.status(404).json({
          success: false,
          message: 'Settlement not found'
        })
      }

      if (settlement.status !== 'pending_approval') {
        return res.status(400).json({
          success: false,
          message: 'Settlement is not pending approval'
        })
      }

      // Add approval
      await settlement.addApproval(
        settlement.approvalLevel,
        req.admin._id,
        'approved',
        comments
      )

      // Log the approval
      await AuditLog.logAction({
        userId: req.admin._id,
        userType: 'center_admin',
        userEmail: req.admin.email,
        action: 'approve_settlement',
        category: 'financial',
        description: `Approved settlement ${settlement.settlementId} for ₹${settlement.netAmount}`,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        sessionId: req.sessionId,
        resourceType: 'settlement',
        resourceId: settlement._id.toString(),
        status: 'success',
        riskLevel: 'high',
        metadata: {
          settlementId: settlement.settlementId,
          amount: settlement.netAmount,
          comments
        }
      })

      return res.json({
        success: true,
        message: 'Settlement approved successfully',
        data: { settlement }
      })
    } catch (error) {
      console.error('Approve settlement error:', error)
      return res.status(500).json({
        success: false,
        message: 'Failed to approve settlement'
      })
    }
  }

  // Generate financial report
  async generateReport(req, res) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        })
      }

      const { type, startDate, endDate, filters = {} } = req.body

      let report

      switch (type) {
        case 'revenue_report':
          report = await FinancialReport.generateRevenueReport(
            new Date(startDate),
            new Date(endDate),
            filters,
            req.admin._id
          )
          break
        case 'profit_loss':
          report = await FinancialReport.generateProfitLossReport(
            new Date(startDate),
            new Date(endDate),
            filters,
            req.admin._id
          )
          break
        default:
          return res.status(400).json({
            success: false,
            message: 'Invalid report type'
          })
      }

      // Log report generation
      await AuditLog.logAction({
        userId: req.admin._id,
        userType: 'center_admin',
        userEmail: req.admin.email,
        action: 'generate_financial_report',
        category: 'financial',
        description: `Generated ${type} report for period ${startDate} to ${endDate}`,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        sessionId: req.sessionId,
        resourceType: 'financial_report',
        resourceId: report._id.toString(),
        status: 'success',
        riskLevel: 'low',
        metadata: {
          reportType: type,
          startDate,
          endDate,
          reportId: report.reportId
        }
      })

      return res.status(201).json({
        success: true,
        message: 'Report generated successfully',
        data: { report }
      })
    } catch (error) {
      console.error('Generate report error:', error)
      return res.status(500).json({
        success: false,
        message: 'Failed to generate report'
      })
    }
  }

  // Get financial reports
  async getReports(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        type,
        status,
        startDate,
        endDate,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query

      // Build query
      const query = {}
      
      if (type) query.type = type
      if (status) query.status = status
      
      if (startDate || endDate) {
        query.createdAt = {}
        if (startDate) query.createdAt.$gte = new Date(startDate)
        if (endDate) query.createdAt.$lte = new Date(endDate)
      }
      
      if (search) {
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { reportId: { $regex: search, $options: 'i' } }
        ]
      }

      // Execute query
      const reports = await FinancialReport.find(query)
        .populate('createdBy', 'name email')
        .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .lean()

      const total = await FinancialReport.countDocuments(query)

      return res.json({
        success: true,
        data: {
          reports,
          pagination: {
            current: parseInt(page),
            pages: Math.ceil(total / limit),
            total,
            limit: parseInt(limit)
          }
        }
      })
    } catch (error) {
      console.error('Get reports error:', error)
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch reports'
      })
    }
  }

  // Get single report
  async getReport(req, res) {
    try {
      const { reportId } = req.params

      const report = await FinancialReport.findById(reportId)
        .populate('createdBy', 'name email')

      if (!report) {
        return res.status(404).json({
          success: false,
          message: 'Report not found'
        })
      }

      // Update access tracking
      await report.updateAccess(req.admin._id)

      return res.json({
        success: true,
        data: { report }
      })
    } catch (error) {
      console.error('Get report error:', error)
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch report'
      })
    }
  }
}

module.exports = new CenterAdminFinancialController()