const express = require('express');
const healthRoutes = require('./healthRoutes');
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const traderRoutes = require('./traderRoutes');
const transactionRoutes = require('./transactionRoutes');
const copyRuleRoutes = require('./copyRuleRoutes');
const paperTradingRoutes = require('./paperTradingRoutes');
const riskRoutes = require('./riskRoutes');
const copyTradingRoutes = require('./copyTradingRoutes');
const executionRoutes = require('./executionRoutes');
const systemRoutes = require('./systemRoutes');
const auditRoutes = require('./auditRoutes');

const router = express.Router();

router.use('/health', healthRoutes);
router.use('/system', systemRoutes);
router.use('/audit', auditRoutes);
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/traders', traderRoutes);
router.use('/transactions', transactionRoutes);
router.use('/copy-rules', copyRuleRoutes);
router.use('/paper', paperTradingRoutes);
router.use('/risk', riskRoutes);
router.use('/copy-trading', copyTradingRoutes);
router.use('/execution', executionRoutes);

module.exports = router;
