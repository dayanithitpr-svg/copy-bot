const express = require('express');
const copyTradingController = require('../../controllers/copyTradingController');
const authenticate = require('../../middleware/authMiddleware');

const router = express.Router();

// All copy-trading endpoints are user-scoped and require JWT authentication
router.use(authenticate);

router.get('/status', (req, res, next) => copyTradingController.getStatus(req, res, next));
router.get('/summary', (req, res, next) => copyTradingController.getSummary(req, res, next));
router.get('/decisions', (req, res, next) => copyTradingController.getDecisions(req, res, next));
router.post('/process/:transactionId', (req, res, next) => copyTradingController.processTransaction(req, res, next));

module.exports = router;
