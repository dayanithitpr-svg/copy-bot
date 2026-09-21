const activityRepository = require('../repositories/activityRepository');
const traderRepository = require('../repositories/traderRepository');
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');

class ActivityController {
  /**
   * Retrieves on-chain activity stream for a specific trader (IDOR Protected)
   */
  async getTraderActivity(req, res, next) {
    try {
      const { id: traderId } = req.params;
      const { page = 1, limit = 20, activityType, status } = req.query;

      // 1. Verify Trader Ownership (IDOR Protection)
      const trader = await traderRepository.findByUserAndId(req.user.id, traderId);
      if (!trader) {
        throw ApiError.notFound('Trader not found or you do not have permission to view its activity');
      }

      // 2. Build Filter
      const filter = {};
      if (activityType) {
        filter.activityType = activityType.toUpperCase();
      }
      if (status) {
        filter.status = status.toUpperCase();
      }

      // 3. Fetch Paginated Activities
      const { items, total } = await activityRepository.listByTrader(
        req.user.id,
        traderId,
        filter,
        {
          page: parseInt(page, 10) || 1,
          limit: Math.min(parseInt(limit, 10) || 20, 100)
        }
      );

      const totalPages = Math.ceil(total / (parseInt(limit, 10) || 20)) || 1;

      return ApiResponse.success(res, {
        statusCode: 200,
        message: 'Trader activity retrieved successfully',
        data: {
          trader: {
            id: trader._id.toString(),
            displayName: trader.displayName,
            network: trader.network,
            walletAddress: trader.walletAddress,
            monitoringStatus: trader.monitoringStatus
          },
          items: items.map((i) => i.toSafeObject()),
          pagination: {
            page: parseInt(page, 10) || 1,
            limit: parseInt(limit, 10) || 20,
            total,
            totalPages,
            hasNextPage: (parseInt(page, 10) || 1) < totalPages
          }
        }
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Retrieves monitoring health and checkpoint status for a trader
   */
  async getTraderMonitoringStatus(req, res, next) {
    try {
      const { id: traderId } = req.params;

      // 1. Verify Trader Ownership
      const trader = await traderRepository.findByUserAndId(req.user.id, traderId);
      if (!trader) {
        throw ApiError.notFound('Trader not found or you do not have permission to view its monitoring status');
      }

      const totalActivities = await activityRepository.countByTrader(req.user.id, traderId);

      return ApiResponse.success(res, {
        statusCode: 200,
        message: 'Monitoring status retrieved successfully',
        data: {
          traderId: trader._id.toString(),
          displayName: trader.displayName,
          network: trader.network,
          walletAddress: trader.walletAddress,
          trackingEnabled: trader.trackingEnabled,
          monitoringStatus: trader.monitoringStatus,
          checkpoints: {
            lastScannedBlock: trader.lastScannedBlock,
            lastScannedSignature: trader.lastScannedSignature
          },
          lastCheckedAt: trader.lastCheckedAt,
          lastSuccessfulCheckAt: trader.lastSuccessfulCheckAt,
          lastErrorAt: trader.lastErrorAt,
          lastErrorMessage: trader.lastErrorMessage,
          lastActivityAt: trader.lastActivityAt,
          totalActivitiesDetected: totalActivities
        }
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Retrieves recent activities across all traders for the logged-in user (Dashboard stream)
   */
  async getRecentActivities(req, res, next) {
    try {
      const { page = 1, limit = 10 } = req.query;

      const { items, total } = await activityRepository.listByUser(
        req.user.id,
        {},
        {
          page: parseInt(page, 10) || 1,
          limit: Math.min(parseInt(limit, 10) || 10, 50)
        }
      );

      const totalPages = Math.ceil(total / (parseInt(limit, 10) || 10)) || 1;

      return ApiResponse.success(res, {
        statusCode: 200,
        message: 'Recent activities retrieved successfully',
        data: {
          items: items.map((i) => i.toSafeObject()),
          pagination: {
            page: parseInt(page, 10) || 1,
            limit: parseInt(limit, 10) || 10,
            total,
            totalPages
          }
        }
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ActivityController();
