const riskConfigRepository = require('../repositories/riskConfigRepository');
const riskEvaluationRepository = require('../repositories/riskEvaluationRepository');
const paperPortfolioRepository = require('../repositories/paperPortfolioRepository');
const copyRuleRepository = require('../repositories/copyRuleRepository');
const riskManagementEngine = require('../services/riskManagementEngine');
const { validateRiskUpdate } = require('../validators/riskValidator');
const logger = require('../utils/logger');

class RiskController {
  /**
   * GET /api/v1/risk
   * Returns authenticated user's risk configuration
   */
  async getRiskConfig(req, res, next) {
    try {
      const userId = req.user.id || req.user.userId;
      const config = await riskConfigRepository.getOrCreateForUser(userId);
      return res.status(200).json({
        success: true,
        data: config.toSafeObject()
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/v1/risk
   * Updates authenticated user's risk configuration
   */
  async updateRiskConfig(req, res, next) {
    try {
      const userId = req.user.id || req.user.userId;
      const validation = validateRiskUpdate(req.body);

      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid risk configuration parameters',
            details: validation.errors
          }
        });
      }

      const updatedConfig = await riskConfigRepository.updateForUser(userId, req.body);
      return res.status(200).json({
        success: true,
        message: 'Risk configuration updated successfully',
        data: updatedConfig.toSafeObject()
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/risk/evaluate
   * Dry-run risk evaluation for a hypothetical trade allocation
   */
  async evaluateDryRun(req, res, next) {
    try {
      const userId = req.user.id || req.user.userId;
      const { copyRuleId, proposedAllocation, network, tokenAddress, confidence } = req.body;

      const portfolio = await paperPortfolioRepository.getOrCreatePortfolio(userId);
      let rule = { userId, traderId: null };
      if (copyRuleId) {
        rule = await copyRuleRepository.findById(copyRuleId, userId);
        if (!rule) {
          return res.status(404).json({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Copy rule not found' }
          });
        }
      }

      const mockTx = {
        network: network || 'ethereum',
        confidence: confidence || 'HIGH',
        swap: {
          inputToken: { address: '0x111', symbol: 'USDC' },
          outputToken: { address: tokenAddress || '0x222', symbol: 'TOKEN' }
        }
      };

      const result = await riskManagementEngine.evaluateRisk(
        rule,
        mockTx,
        portfolio,
        Number(proposedAllocation) || 100
      );

      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/risk/history
   * Retrieves paginated risk evaluation audit records for the authenticated user
   */
  async getRiskHistory(req, res, next) {
    try {
      const userId = req.user.id || req.user.userId;
      const { decision, network, traderId, page = 1, limit = 20 } = req.query;

      const result = await riskEvaluationRepository.listByUser(
        userId,
        { decision, network, traderId },
        { page, limit }
      );

      return res.status(200).json({
        success: true,
        data: result.evaluations,
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
}

module.exports = new RiskController();
