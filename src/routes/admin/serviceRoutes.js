const express = require('express')
const router = express.Router()
const {
  getServices,
  getService,
  createService,
  updateService,
  deleteService,
  assignServiceToBranch,
  updateBranchService,
  removeServiceFromBranch,
  getBranchServices,
  bulkAssignServices
} = require('../../controllers/admin/serviceController')
const { protectAny, restrictTo } = require('../../middlewares/auth')

// All routes require authentication (protectAny accepts both user and center admin tokens)
router.use(protectAny)

// Service CRUD routes
router.route('/')
  .get(restrictTo('admin', 'super_admin', 'center_admin', 'branch_manager'), getServices)
  .post(restrictTo('admin', 'super_admin', 'center_admin'), createService)

router.route('/:id')
  .get(restrictTo('admin', 'super_admin', 'center_admin', 'branch_manager'), getService)
  .put(restrictTo('admin', 'super_admin', 'center_admin'), updateService)
  .delete(restrictTo('admin', 'super_admin'), deleteService)

// Branch assignment routes
router.route('/:id/branches')
  .post(restrictTo('admin', 'super_admin', 'center_admin'), assignServiceToBranch)

router.route('/:id/branches/:branchId')
  .put(restrictTo('admin', 'super_admin', 'center_admin'), updateBranchService)
  .delete(restrictTo('admin', 'super_admin', 'center_admin'), removeServiceFromBranch)

module.exports = router
