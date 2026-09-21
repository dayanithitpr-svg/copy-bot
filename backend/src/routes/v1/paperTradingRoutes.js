const express = require('express');
const paperTradingController = require('../../controllers/paperTradingController');
const authenticate = require('../../middleware/authMiddleware');
const validateRequest = require('../../middleware/validateRequest');
const { idParamValidator } = require('../../validators/traderValidators');

const router = express.Router();

router.use(authenticate);

router.get('/portfolio', paperTradingController.getPortfolio);
router.post('/reset', paperTradingController.resetPortfolio);
router.get('/trades', paperTradingController.listTrades);
router.get('/trades/:id', idParamValidator, validateRequest, paperTradingController.getTradeById);
router.get('/summary', paperTradingController.getSummary);

module.exports = router;
