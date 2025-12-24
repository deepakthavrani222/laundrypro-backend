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
const { checkPermission } = require('../../middlewares/checkPermission')

// All routes require authentication (protectAny accepts both user and center admin tokens)
router.use(protectAny)

// Service CRUD routes with permission checks
router.route('/')
  .get(restrictTo('admin', 'superadmin', 'center_admin'), checkPermission('services', 'view'), getServices)
  .post(restrictTo('admin', 'superadmin'), checkPermission('services', 'create'), createService)

router.route('/:id')
  .get(restrictTo('admin', 'superadmin', 'center_admin'), checkPermission('services', 'view'), getService)
  .put(restrictTo('admin', 'superadmin'), checkPermission('services', 'update'), updateService)
  .delete(restrictTo('admin', 'superadmin'), checkPermission('services', 'delete'), deleteService)

// Branch assignment routes
router.route('/:id/branches')
  .post(restrictTo('admin', 'superadmin'), checkPermission('services', 'update'), assignServiceToBranch)

router.route('/:id/branches/:branchId')
  .put(restrictTo('admin', 'superadmin'), checkPermission('services', 'update'), updateBranchService)
  .delete(restrictTo('admin', 'superadmin'), checkPermission('services', 'delete'), removeServiceFromBranch)

module.exports = router
