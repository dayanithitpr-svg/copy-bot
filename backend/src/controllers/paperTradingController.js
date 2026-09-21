const paperPortfolioRepository = require('../repositories/paperPortfolioRepository');
const paperTradeRepository = require('../repositories/paperTradeRepository');
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');

class PaperTradingController {
  /**
   * Retrieves the user's virtual paper portfolio (cash + token holdings)
   * GET /api/v1/paper/portfolio
   */
  async getPortfolio(req, res, next) {
    try {
      const portfolio = await paperPortfolioRepository.getOrCreatePortfolio(req.user.id);

      return ApiResponse.success(res, {
        statusCode: 200,
        message: 'Paper portfolio retrieved successfully',
        data: {
          portfolio: portfolio.toSafeObject()
        }
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Resets the user's virtual paper balance back to 10,000 Paper USDC
   * POST /api/v1/paper/reset
   */
  async resetPortfolio(req, res, next) {
    try {
      const { initialBalance = 10000.0 } = req.body;
      const portfolio = await paperPortfolioRepository.resetPortfolio(req.user.id, Number(initialBalance));

      return ApiResponse.success(res, {
        statusCode: 200,
        message: 'Paper portfolio reset to starting virtual balance',
        data: {
          portfolio: portfolio.toSafeObject()
        }
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Lists paper trades for the authenticated user (SIMULATED and SKIPPED)
   * GET /api/v1/paper/trades
   */
  async listTrades(req, res, next) {
    try {
      const { page = 1, limit = 20, status, traderId, network } = req.query;

      const filter = {};
      if (status) filter.status = status.toUpperCase();
      if (traderId) filter.traderId = traderId;
      if (network) filter.network = network.toLowerCase();

      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(Math.max(1, parseInt(limit, 10) || 20), 100);

      const { items, total } = await paperTradeRepository.listByUser(
        req.user.id,
        filter,
        { page: pageNum, limit: limitNum }
      );

      const totalPages = Math.ceil(total / limitNum) || 1;

      return ApiResponse.success(res, {
        statusCode: 200,
        message: 'Paper trades retrieved successfully',
        data: {
          items: items.map((t) => t.toSafeObject()),
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages,
            hasNextPage: pageNum < totalPages
          }
        }
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Retrieves single paper trade by ID (IDOR Protected)
   * GET /api/v1/paper/trades/:id
   */
  async getTradeById(req, res, next) {
    try {
      const { id } = req.params;
      const trade = await paperTradeRepository.findByIdAndUser(id, req.user.id);

      if (!trade) {
        throw ApiError.notFound('Paper trade record not found');
      }

      return ApiResponse.success(res, {
        statusCode: 200,
        message: 'Paper trade details retrieved successfully',
        data: {
          trade: trade.toSafeObject()
        }
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Retrieves paper simulation summary metrics
   * GET /api/v1/paper/summary
   */
  async getSummary(req, res, next) {
    try {
      const [portfolio, tradeStats] = await Promise.all([
        paperPortfolioRepository.getOrCreatePortfolio(req.user.id),
        paperTradeRepository.getTradeSummary(req.user.id)
      ]);

      return ApiResponse.success(res, {
        statusCode: 200,
        message: 'Paper trading summary retrieved successfully',
        data: {
          baseCurrency: portfolio.baseCurrency,
          virtualCashBalance: portfolio.virtualCashBalance,
          initialBalance: portfolio.initialBalance,
          holdingsCount: (portfolio.holdings || []).length,
          trades: tradeStats
        }
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new PaperTradingController();
