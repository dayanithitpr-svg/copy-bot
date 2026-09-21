const express = require('express');
const executionController = require('../../controllers/executionController');
const authenticate = require('../../middleware/authMiddleware');
const { executionLimiter, dryRunLimiter } = require('../../middleware/rateLimiter');

const router = express.Router();

// All execution routes require authentication
router.use(authenticate);

// User execution settings
router.get('/config', (req, res, next) => executionController.getConfig(req, res, next));
router.patch('/config', executionLimiter, (req, res, next) => executionController.updateConfig(req, res, next));

// Testnet audit records
router.get('/records', (req, res, next) => executionController.getRecords(req, res, next));

// Testnet networks and tokens
router.get('/networks', (req, res, next) => executionController.getNetworks(req, res, next));

// Pre-execution safety dry-run check
router.post('/dry-run', dryRunLimiter, (req, res, next) => executionController.validateSafetyDryRun(req, res, next));

module.exports = router;
