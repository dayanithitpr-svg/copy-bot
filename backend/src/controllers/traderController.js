const traderService = require('../services/traderService');
const ApiResponse = require('../utils/apiResponse');
const { getAllNetworksMetadata } = require('../networks');

class TraderController {
  async createTrader(req, res, next) {
    try {
      const { displayName, walletAddress, network, notes } = req.body;
      const trader = await traderService.createTrader(req.user.id, {
        displayName,
        walletAddress,
        network,
        notes
      });

      return ApiResponse.success(res, {
        statusCode: 201,
        message: 'Trader added successfully',
        data: { trader }
      });
    } catch (err) {
      next(err);
    }
  }

  async listTraders(req, res, next) {
    try {
      const { page, limit, network, status, search } = req.query;
      const result = await traderService.listTraders(req.user.id, {
        page,
        limit,
        network,
        status,
        search
      });

      return ApiResponse.success(res, {
        statusCode: 200,
        message: 'Traders retrieved successfully',
        data: {
          items: result.items,
          pagination: {
            page: result.page,
            limit: result.limit,
            total: result.total,
            totalPages: result.totalPages
          }
        }
      });
    } catch (err) {
      next(err);
    }
  }

  async getTraderById(req, res, next) {
    try {
      const trader = await traderService.getTraderById(req.user.id, req.params.id);
      return ApiResponse.success(res, {
        statusCode: 200,
        message: 'Trader details retrieved successfully',
        data: { trader }
      });
    } catch (err) {
      next(err);
    }
  }

  async updateTrader(req, res, next) {
    try {
      const { displayName, notes, trackingEnabled } = req.body;
      const trader = await traderService.updateTrader(req.user.id, req.params.id, {
        displayName,
        notes,
        trackingEnabled
      });

      return ApiResponse.success(res, {
        statusCode: 200,
        message: 'Trader updated successfully',
        data: { trader }
      });
    } catch (err) {
      next(err);
    }
  }

  async toggleStatus(req, res, next) {
    try {
      const { trackingEnabled } = req.body;
      const trader = await traderService.toggleTrackingStatus(
        req.user.id,
        req.params.id,
        trackingEnabled
      );

      return ApiResponse.success(res, {
        statusCode: 200,
        message: `Tracking ${trackingEnabled ? 'enabled' : 'paused'} successfully`,
        data: { trader }
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteTrader(req, res, next) {
    try {
      await traderService.deleteTrader(req.user.id, req.params.id);
      return ApiResponse.success(res, {
        statusCode: 200,
        message: 'Trader removed from tracking successfully'
      });
    } catch (err) {
      next(err);
    }
  }

  async getSummary(req, res, next) {
    try {
      const summary = await traderService.getTraderSummary(req.user.id);
      return ApiResponse.success(res, {
        statusCode: 200,
        message: 'Trader summary retrieved successfully',
        data: { summary }
      });
    } catch (err) {
      next(err);
    }
  }

  async getNetworks(req, res, next) {
    try {
      const networks = getAllNetworksMetadata();
      return ApiResponse.success(res, {
        statusCode: 200,
        message: 'Supported blockchain networks retrieved',
        data: { networks }
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new TraderController();
