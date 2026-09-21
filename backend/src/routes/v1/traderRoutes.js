const express = require('express');
const traderController = require('../../controllers/traderController');
const activityController = require('../../controllers/activityController');
const transactionController = require('../../controllers/transactionController');
const authenticate = require('../../middleware/authMiddleware');
const validateRequest = require('../../middleware/validateRequest');
const {
  createTraderValidator,
  updateTraderValidator,
  statusToggleValidator,
  listQueryValidator,
  idParamValidator
} = require('../../validators/traderValidators');

const router = express.Router();

// All trader endpoints strictly require verified authentication
router.use(authenticate);

// 1. Metadata, Summary, and User-level Activity routes
router.get('/networks', traderController.getNetworks);
router.get('/summary', traderController.getSummary);
router.get('/activity/recent', activityController.getRecentActivities);

// 2. Collection routes
router.post(
  '/',
  createTraderValidator,
  validateRequest,
  traderController.createTrader
);

router.get(
  '/',
  listQueryValidator,
  validateRequest,
  traderController.listTraders
);

// 3. Individual resource routes & Activity/Transaction endpoints
router.get(
  '/:id',
  idParamValidator,
  validateRequest,
  traderController.getTraderById
);

router.get(
  '/:id/activity',
  idParamValidator,
  validateRequest,
  activityController.getTraderActivity
);

router.get(
  '/:id/transactions',
  idParamValidator,
  validateRequest,
  transactionController.getTraderTransactions
);

router.get(
  '/:id/swaps',
  idParamValidator,
  validateRequest,
  transactionController.getTraderSwaps
);

router.get(
  '/:id/transfers',
  idParamValidator,
  validateRequest,
  transactionController.getTraderTransfers
);

router.get(
  '/:id/monitoring',
  idParamValidator,
  validateRequest,
  activityController.getTraderMonitoringStatus
);

router.patch(
  '/:id',
  updateTraderValidator,
  validateRequest,
  traderController.updateTrader
);

router.patch(
  '/:id/status',
  statusToggleValidator,
  validateRequest,
  traderController.toggleStatus
);

router.delete(
  '/:id',
  idParamValidator,
  validateRequest,
  traderController.deleteTrader
);

module.exports = router;
