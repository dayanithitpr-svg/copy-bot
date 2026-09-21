const express = require('express');
const authController = require('../../controllers/authController');
const { registerValidator, loginValidator } = require('../../validators/authValidators');
const validateRequest = require('../../middleware/validateRequest');
const authenticate = require('../../middleware/authMiddleware');
const { authLimiter } = require('../../middleware/rateLimiter');

const router = express.Router();

// Apply auth rate limiter to all auth routes
router.use(authLimiter);

// Public Auth Endpoints
router.post('/register', registerValidator, validateRequest, authController.register);
router.post('/login', loginValidator, validateRequest, authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);

// Protected Auth Verification Endpoint
router.get('/me', authenticate, authController.getCurrentUser);

module.exports = router;
