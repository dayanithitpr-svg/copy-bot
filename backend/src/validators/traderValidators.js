const { body, query, param } = require('express-validator');
const { SUPPORTED_NETWORKS, validateWalletAddress } = require('../networks');
const { TRADER_STATUS } = require('../models/Trader');

const createTraderValidator = [
  body('displayName')
    .trim()
    .notEmpty().withMessage('Trader display name is required')
    .isLength({ min: 2, max: 60 }).withMessage('Display name must be between 2 and 60 characters'),

  body('network')
    .trim()
    .notEmpty().withMessage('Blockchain network is required')
    .toLowerCase()
    .isIn(SUPPORTED_NETWORKS).withMessage(`Network must be one of: ${SUPPORTED_NETWORKS.join(', ')}`),

  body('walletAddress')
    .trim()
    .notEmpty().withMessage('Public wallet address is required')
    .custom((value, { req }) => {
      const network = req.body.network;
      if (!network || !SUPPORTED_NETWORKS.includes(network.toLowerCase())) {
        return true; // Let network validator handle invalid network error
      }
      const validation = validateWalletAddress(network, value);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }
      return true;
    }),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Notes cannot exceed 500 characters')
];

const updateTraderValidator = [
  param('id')
    .isMongoId().withMessage('Invalid trader ID format'),

  body('displayName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 60 }).withMessage('Display name must be between 2 and 60 characters'),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Notes cannot exceed 500 characters'),

  body('trackingEnabled')
    .optional()
    .isBoolean().withMessage('trackingEnabled must be a boolean')
];

const statusToggleValidator = [
  param('id')
    .isMongoId().withMessage('Invalid trader ID format'),

  body('trackingEnabled')
    .notEmpty().withMessage('trackingEnabled is required')
    .isBoolean().withMessage('trackingEnabled must be a boolean')
];

const listQueryValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer')
    .toInt(),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
    .toInt(),

  query('network')
    .optional()
    .toLowerCase()
    .isIn(SUPPORTED_NETWORKS).withMessage(`Network must be one of: ${SUPPORTED_NETWORKS.join(', ')}`),

  query('status')
    .optional()
    .toUpperCase()
    .isIn(Object.values(TRADER_STATUS)).withMessage(`Status must be one of: ${Object.values(TRADER_STATUS).join(', ')}`),

  query('search')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Search query cannot exceed 100 characters')
];

const idParamValidator = [
  param('id')
    .isMongoId().withMessage('Invalid trader ID format')
];

module.exports = {
  createTraderValidator,
  updateTraderValidator,
  statusToggleValidator,
  listQueryValidator,
  idParamValidator
};
