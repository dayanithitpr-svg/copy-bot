const copyTradingEngine = require('../services/copyTradingEngine');
const paperTradeRepository = require('../repositories/paperTradeRepository');
const parsedTransactionRepository = require('../repositories/parsedTransactionRepository');
const traderRepository = require('../repositories/traderRepository');
const logger = require('../utils/logger');

class CopyTradingController {
  /**
   * GET /api/v1/copy-trading/status
   * Returns operational status, active copy rules count, and environment information
   */
  async getStatus(req, res, next) {
    try {
      const userId = req.user.id || req.user.userId;
      const status = await copyTradingEngine.getEngineStatus(userId);
      return res.status(200).json({
        success: true,
        data: status
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/copy-trading/summary
   * Returns copy trading summary performance metrics (total processed, copied, skipped, blocked, volume)
   */
  async getSummary(req, res, next) {
    try {
      const userId = req.user.id || req.user.userId;
      const summary = await copyTradingEngine.getDecisionsSummary(userId);
      return res.status(200).json({
        success: true,
        data: summary
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/copy-trading/decisions
   * Retrieves paginated copy trading decisions and execution audit history
   */
  async getDecisions(req, res, next) {
    try {
      const userId = req.user.id || req.user.userId;
      const { status, network, traderId, skipReason, page = 1, limit = 20 } = req.query;

      const result = await paperTradeRepository.listDecisions(
        userId,
        { status, network, traderId, skipReason },
        { page, limit }
      );

      return res.status(200).json({
        success: true,
        data: result.items,
        pagination: {
          total: result.total,
          page: result.page,
          pages: result.pages,
          limit: parseInt(limit, 10) || 20
        }
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/copy-trading/process/:transactionId
   * Safe manual trigger for evaluating an existing parsed transaction through CopyRule → Risk → Paper pipeline
   */
  async processTransaction(req, res, next) {
    try {
      const userId = req.user.id || req.user.userId;
      const { transactionId } = req.params;

      const parsedTx = await parsedTransactionRepository.findById(transactionId);
      if (!parsedTx) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Parsed transaction not found' }
        });
      }

      // IDOR / Ownership Protection: Ensure trader belongs to current user
      const trader = await traderRepository.findByIdAndUser(parsedTx.traderId, userId);
      if (!trader) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'You do not have permission to copy trades from this trader' }
        });
      }

      const results = await copyTradingEngine.processTransactionForRules(parsedTx);
      return res.status(200).json({
        success: true,
        message: `Processed transaction across ${results.length} copy rule(s)`,
        data: results
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new CopyTradingController();
