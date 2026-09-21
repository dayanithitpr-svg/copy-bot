const express = require('express');
const transactionController = require('../../controllers/transactionController');
const authenticate = require('../../middleware/authMiddleware');
const validateRequest = require('../../middleware/validateRequest');
const { idParamValidator } = require('../../validators/traderValidators');

const router = express.Router();

// All transaction endpoints require authentication
router.use(authenticate);

// 1. Recent parsed transactions across user's tracked traders
router.get('/recent', transactionController.getRecentTransactions);

// 2. Fetch single transaction by ID
router.get('/:id', idParamValidator, validateRequest, transactionController.getTransactionById);

module.exports = router;
