const copyRuleRepository = require('../repositories/copyRuleRepository');
const traderRepository = require('../repositories/traderRepository');
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');

class CopyRuleController {
  /**
   * Creates a new copy rule for a tracked trader
   * POST /api/v1/copy-rules
   */
  async createRule(req, res, next) {
    try {
      const {
        traderId,
        allocationMode = 'FIXED_AMOUNT',
        allocationValue = 100,
        maxTradeAmount = 1000,
        maxDailyAmount = 5000,
        allowedNetworks,
        allowedTokens,
        blockedTokens,
        minConfidence = 'MEDIUM'
      } = req.body;

      if (!traderId) {
        throw ApiError.badRequest('Trader ID is required to create a copy rule');
      }

      // 1. Verify Trader exists and belongs to the user (IDOR check)
      const trader = await traderRepository.findByUserAndId(req.user.id, traderId);
      if (!trader) {
        throw ApiError.notFound('Trader not found or does not belong to your account');
      }

      // 2. Create the rule
      const rule = await copyRuleRepository.create({
        userId: req.user.id,
        traderId,
        allocationMode,
        allocationValue: Number(allocationValue),
        maxTradeAmount: Number(maxTradeAmount),
        maxDailyAmount: Number(maxDailyAmount),
        allowedNetworks: allowedNetworks || [trader.network],
        allowedTokens: allowedTokens || [],
        blockedTokens: blockedTokens || [],
        minConfidence,
        enabled: true
      });

      return ApiResponse.success(res, {
        statusCode: 201,
        message: 'Copy rule configured successfully',
        data: {
          copyRule: rule.toSafeObject()
        }
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Lists all copy rules for the authenticated user
   * GET /api/v1/copy-rules
   */
  async listRules(req, res, next) {
    try {
      const rules = await copyRuleRepository.listByUser(req.user.id);

      return ApiResponse.success(res, {
        statusCode: 200,
        message: 'Copy rules retrieved successfully',
        data: {
          copyRules: rules.map((r) => r.toSafeObject())
        }
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Gets a single copy rule by ID (IDOR Protected)
   * GET /api/v1/copy-rules/:id
   */
  async getRuleById(req, res, next) {
    try {
      const { id } = req.params;
      const rule = await copyRuleRepository.findByUserAndId(req.user.id, id);

      if (!rule) {
        throw ApiError.notFound('Copy rule not found or you do not have permission to view it');
      }

      return ApiResponse.success(res, {
        statusCode: 200,
        message: 'Copy rule retrieved successfully',
        data: {
          copyRule: rule.toSafeObject()
        }
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Updates an existing copy rule (IDOR Protected)
   * PATCH /api/v1/copy-rules/:id
   */
  async updateRule(req, res, next) {
    try {
      const { id } = req.params;
      const {
        allocationMode,
        allocationValue,
        maxTradeAmount,
        maxDailyAmount,
        allowedNetworks,
        allowedTokens,
        blockedTokens,
        minConfidence,
        enabled
      } = req.body;

      const updateData = {};
      if (allocationMode !== undefined) updateData.allocationMode = allocationMode;
      if (allocationValue !== undefined) updateData.allocationValue = Number(allocationValue);
      if (maxTradeAmount !== undefined) updateData.maxTradeAmount = Number(maxTradeAmount);
      if (maxDailyAmount !== undefined) updateData.maxDailyAmount = Number(maxDailyAmount);
      if (allowedNetworks !== undefined) updateData.allowedNetworks = allowedNetworks;
      if (allowedTokens !== undefined) updateData.allowedTokens = allowedTokens;
      if (blockedTokens !== undefined) updateData.blockedTokens = blockedTokens;
      if (minConfidence !== undefined) updateData.minConfidence = minConfidence;
      if (enabled !== undefined) updateData.enabled = Boolean(enabled);

      const updated = await copyRuleRepository.update(req.user.id, id, updateData);

      return ApiResponse.success(res, {
        statusCode: 200,
        message: 'Copy rule updated successfully',
        data: {
          copyRule: updated.toSafeObject()
        }
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Toggles enable/disable on a copy rule
   * PATCH /api/v1/copy-rules/:id/toggle
   */
  async toggleRule(req, res, next) {
    try {
      const { id } = req.params;
      const existing = await copyRuleRepository.findByUserAndId(req.user.id, id);

      if (!existing) {
        throw ApiError.notFound('Copy rule not found');
      }

      const updated = await copyRuleRepository.update(req.user.id, id, {
        enabled: !existing.enabled
      });

      return ApiResponse.success(res, {
        statusCode: 200,
        message: `Copy rule ${updated.enabled ? 'enabled' : 'paused'} successfully`,
        data: {
          copyRule: updated.toSafeObject()
        }
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Deletes a copy rule
   * DELETE /api/v1/copy-rules/:id
   */
  async deleteRule(req, res, next) {
    try {
      const { id } = req.params;
      await copyRuleRepository.delete(req.user.id, id);

      return ApiResponse.success(res, {
        statusCode: 200,
        message: 'Copy rule removed successfully',
        data: { id }
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new CopyRuleController();
