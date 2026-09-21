const express = require('express');
const systemController = require('../../controllers/systemController');
const authenticate = require('../../middleware/authMiddleware');

const router = express.Router();

// Public Operational Status
router.get('/status', (req, res, next) => systemController.getStatus(req, res, next));

// Public / Authenticated Metrics
router.get('/metrics', (req, res, next) => systemController.getMetrics(req, res, next));

// Authenticated Operational Controls
router.post('/kill-switch', authenticate, (req, res, next) => systemController.setKillSwitch(req, res, next));
router.post('/recover', authenticate, (req, res, next) => systemController.triggerRecovery(req, res, next));

module.exports = router;
