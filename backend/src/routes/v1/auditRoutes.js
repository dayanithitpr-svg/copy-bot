const express = require('express');
const auditController = require('../../controllers/auditController');
const authenticate = require('../../middleware/authMiddleware');

const router = express.Router();

// All audit routes require authentication
router.use(authenticate);

router.get('/logs', (req, res, next) => auditController.getLogs(req, res, next));

module.exports = router;
