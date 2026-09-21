const express = require('express');
const userController = require('../../controllers/userController');
const authenticate = require('../../middleware/authMiddleware');
const { requireRole } = require('../../middleware/roleMiddleware');
const { ROLES } = require('../../config/constants');
const ApiResponse = require('../../utils/apiResponse');

const router = express.Router();

// All user routes require authentication
router.use(authenticate);

router.get('/profile', userController.getProfile);
router.put('/profile', userController.updateProfile);

// Admin-only verification route for RBAC testing
router.get('/admin/overview', requireRole(ROLES.ADMIN), (req, res) => {
  return ApiResponse.success(res, {
    statusCode: 200,
    message: 'Admin access granted',
    data: {
      adminUser: req.user.email,
      platformStatus: 'Phase 1 Foundation Active',
      timestamp: new Date().toISOString()
    }
  });
});

module.exports = router;
