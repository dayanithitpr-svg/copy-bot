const express = require('express');
const riskController = require('../../controllers/riskController');
const authenticate = require('../../middleware/authMiddleware');

const router = express.Router();

// All risk endpoints are user-scoped and require JWT authentication
router.use(authenticate);

router.get('/', (req, res, next) => riskController.getRiskConfig(req, res, next));
router.patch('/', (req, res, next) => riskController.updateRiskConfig(req, res, next));
router.post('/evaluate', (req, res, next) => riskController.evaluateDryRun(req, res, next));
router.get('/history', (req, res, next) => riskController.getRiskHistory(req, res, next));

module.exports = router;
