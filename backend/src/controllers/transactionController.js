const parsedTransactionRepository = require('../repositories/parsedTransactionRepository');
const traderRepository = require('../repositories/traderRepository');
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');
const { CLASSIFICATION } = require('../blockchain/parser/TransactionParser');

class TransactionController {
  /**
   * Retrieves all parsed transactions for a trader with IDOR protection
   * GET /api/v1/traders/:id/transactions
   */
  async getTraderTransactions(req, res, next) {
    try {
      const { id: traderId } = req.params;
      const { page = 1, limit = 20, classification, confidence, status, network } = req.query;

      // 1. IDOR Check: Ensure trader belongs to the authenticated user
      const trader = await traderRepository.findByUserAndId(req.user.id, traderId);
      if (!trader) {
        throw ApiError.notFound('Trader not found or you do not have permission to access its transactions');
      }

      // 2. Build Filter
      const filter = {};
      if (classification) filter.classification = classification.toUpperCase();
      if (confidence) filter.confidence = confidence.toUpperCase();
      if (status) filter.status = status.toUpperCase();
      if (network) filter.network = network.toLowerCase();

      // 3. Paginated Query
      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(Math.max(1, parseInt(limit, 10) || 20), 100);

      const { items, total } = await parsedTransactionRepository.listByTrader(
        req.user.id,
        traderId,
        filter,
        { page: pageNum, limit: limitNum }
      );

      const totalPages = Math.ceil(total / limitNum) || 1;

      return ApiResponse.success(res, {
        statusCode: 200,
        message: 'Trader transactions retrieved successfully',
        data: {
          trader: {
            id: trader._id.toString(),
            displayName: trader.displayName,
            network: trader.network,
            walletAddress: trader.walletAddress
          },
          items: items.map((i) => i.toSafeObject()),
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
   * Retrieves only SWAP transactions for a trader (IDOR Protected)
   * GET /api/v1/traders/:id/swaps
   */
  async getTraderSwaps(req, res, next) {
    try {
      const { id: traderId } = req.params;
      const { page = 1, limit = 20 } = req.query;

      const trader = await traderRepository.findByUserAndId(req.user.id, traderId);
      if (!trader) {
        throw ApiError.notFound('Trader not found or you do not have permission to access its swaps');
      }

      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(Math.max(1, parseInt(limit, 10) || 20), 100);

      const { items, total } = await parsedTransactionRepository.listByTrader(
        req.user.id,
        traderId,
        { classification: CLASSIFICATION.SWAP },
        { page: pageNum, limit: limitNum }
      );

      const totalPages = Math.ceil(total / limitNum) || 1;

      return ApiResponse.success(res, {
        statusCode: 200,
        message: 'Trader swaps retrieved successfully',
        data: {
          trader: {
            id: trader._id.toString(),
            displayName: trader.displayName,
            network: trader.network,
            walletAddress: trader.walletAddress
          },
          items: items.map((i) => i.toSafeObject()),
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
   * Retrieves token and native transfers for a trader (IDOR Protected)
   * GET /api/v1/traders/:id/transfers
   */
  async getTraderTransfers(req, res, next) {
    try {
      const { id: traderId } = req.params;
      const { page = 1, limit = 20 } = req.query;

      const trader = await traderRepository.findByUserAndId(req.user.id, traderId);
      if (!trader) {
        throw ApiError.notFound('Trader not found or you do not have permission to access its transfers');
      }

      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(Math.max(1, parseInt(limit, 10) || 20), 100);

      const { items, total } = await parsedTransactionRepository.listByTrader(
        req.user.id,
        traderId,
        { classification: { $in: [CLASSIFICATION.TRANSFER, CLASSIFICATION.TOKEN_TRANSFER] } },
        { page: pageNum, limit: limitNum }
      );

      const totalPages = Math.ceil(total / limitNum) || 1;

      return ApiResponse.success(res, {
        statusCode: 200,
        message: 'Trader transfers retrieved successfully',
        data: {
          trader: {
            id: trader._id.toString(),
            displayName: trader.displayName,
            network: trader.network,
            walletAddress: trader.walletAddress
          },
          items: items.map((i) => i.toSafeObject()),
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
   * Retrieves a single parsed transaction by ID (IDOR Protected)
   * GET /api/v1/transactions/:id
   */
  async getTransactionById(req, res, next) {
    try {
      const { id } = req.params;

      const tx = await parsedTransactionRepository.findByIdAndUser(id, req.user.id);
      if (!tx) {
        throw ApiError.notFound('Transaction not found or you do not have permission to access it');
      }

      return ApiResponse.success(res, {
        statusCode: 200,
        message: 'Transaction details retrieved successfully',
        data: {
          transaction: tx.toSafeObject()
        }
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Retrieves recent parsed transactions across all user traders (Dashboard/Explorer)
   * GET /api/v1/transactions/recent
   */
  async getRecentTransactions(req, res, next) {
    try {
      const { page = 1, limit = 15, classification, network } = req.query;

      const filter = {};
      if (classification) filter.classification = classification.toUpperCase();
      if (network) filter.network = network.toLowerCase();

      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(Math.max(1, parseInt(limit, 10) || 15), 50);

      const { items, total } = await parsedTransactionRepository.listByUser(
        req.user.id,
        filter,
        { page: pageNum, limit: limitNum }
      );

      const totalPages = Math.ceil(total / limitNum) || 1;

      return ApiResponse.success(res, {
        statusCode: 200,
        message: 'Recent transactions retrieved successfully',
        data: {
          items: items.map((i) => i.toSafeObject()),
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
}

module.exports = new TransactionController();
