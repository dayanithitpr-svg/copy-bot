const express = require('express');
const healthController = require('../../controllers/healthController');

const router = express.Router();

// General Health Check
router.get('/', healthController.checkHealth);

// Liveness Probe
router.get('/liveness', healthController.checkLiveness);

// Readiness Probe
router.get('/readiness', healthController.checkReadiness);

module.exports = router;
