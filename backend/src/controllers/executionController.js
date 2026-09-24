const executionConfigRepository = require('../repositories/executionConfigRepository');
const executionRecordRepository = require('../repositories/executionRecordRepository');
const executionSafetyService = require('../blockchain/execution/executionSafetyService');
const executionNetworkRegistry = require('../blockchain/execution/executionNetworkRegistry');
const testnetTokenRegistry = require('../blockchain/execution/testnetTokenRegistry');
const productionSafetyService = require('../security/productionSafetyService');
const auditService = require('../services/auditService');
const { AUDIT_EVENT_TYPE, AUDIT_SEVERITY } = require('../models/AuditLog');
const { validateExecutionConfigUpdate } = require('../validators/executionValidator');
const env = require('../config/env');
const logger = require('../utils/logger');

class ExecutionController {
  /**
   * GET /api/v1/execution/config
   * Returns authenticated user's testnet execution configuration
   */
  async getConfig(req, res, next) {
    try {
      const userId = req.user.id || req.user.userId;
      const config = await executionConfigRepository.getOrCreateForUser(userId);
      const dailySpent = await executionRecordRepository.getDailyExecutedAmount(userId);

      const killSwitchActive = productionSafetyService.isKillSwitchActive();

      return res.status(200).json({
        success: true,
        data: {
          ...config.toSafeObject(),
          dailySpent,
          globalTestnetEnabled: !killSwitchActive,
          killSwitchActive,
          mainnetStatus: 'BLOCKED'
        }
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/v1/execution/config
   * Updates authenticated user's execution configuration
   */
  async updateConfig(req, res, next) {
    try {
      const userId = req.user.id || req.user.userId;
      const validation = validateExecutionConfigUpdate(req.body);

      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid execution configuration parameters',
            details: validation.errors
          }
        });
      }

      const updatedConfig = await executionConfigRepository.updateForUser(userId, req.body);
      const dailySpent = await executionRecordRepository.getDailyExecutedAmount(userId);
      const killSwitchActive = productionSafetyService.isKillSwitchActive();

      // Audit configuration update
      await auditService.logEvent({
        userId,
        eventType: AUDIT_EVENT_TYPE.EXECUTION_MODE_CHANGED,
        severity: AUDIT_SEVERITY.INFO,
        resourceType: 'EXECUTION',
        action: 'EXECUTION_CONFIG_UPDATED',
        requestId: req.id,
        details: { mode: updatedConfig.mode, enabled: updatedConfig.enabled }
      });

      return res.status(200).json({
        success: true,
        message: 'Execution configuration updated successfully',
        data: {
          ...updatedConfig.toSafeObject(),
          dailySpent,
          globalTestnetEnabled: !killSwitchActive,
          killSwitchActive,
          mainnetStatus: 'BLOCKED'
        }
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/execution/records
   * Retrieves paginated testnet execution audit records for authenticated user
   */
  async getRecords(req, res, next) {
    try {
      const userId = req.user.id || req.user.userId;
      const { network, status, traderId, page = 1, limit = 20 } = req.query;

      const result = await executionRecordRepository.listByUser(
        userId,
        { network, status, traderId },
        { page: parseInt(page, 10) || 1, limit: parseInt(limit, 10) || 20 }
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
   * GET /api/v1/execution/networks
   * Returns list of approved testnet networks and verified testnet tokens
   */
  async getNetworks(req, res, next) {
    try {
      const allowedNetworks = executionNetworkRegistry.getAllowedNetworks();
      const networkData = allowedNetworks.map((net) => {
        const routerInfo = executionNetworkRegistry.getRouter(net.id);
        return {
          id: net.id,
          name: net.name,
          chainId: net.chainId,
          currencySymbol: net.nativeCurrency?.symbol || 'ETH',
          explorerUrl: net.explorerUrl,
          uniswapV2Router: routerInfo?.address || (Array.isArray(net.protocols) ? net.protocols.join(', ') : 'N/A'),
          protocols: net.protocols || [],
          tokens: testnetTokenRegistry.getTokensForNetwork(net.id) || []
        };
      });

      const killSwitchActive = productionSafetyService.isKillSwitchActive();

      return res.status(200).json({
        success: true,
        data: {
          networks: networkData,
          globalKillSwitch: killSwitchActive,
          testnetEnabled: !killSwitchActive,
          mainnetStatus: 'BLOCKED',
          hasExecutionSigner: Boolean(env.TESTNET_EXECUTION_PRIVATE_KEY)
        }
      });
    } catch (err) {
      logger.error('Error fetching execution networks:', err);
      next(err);
    }
  }

  /**
   * POST /api/v1/execution/dry-run
   * Validates pre-execution safety gates for a simulated testnet transaction
   */
  async validateSafetyDryRun(req, res, next) {
    try {
      const userId = req.user.id || req.user.userId;
      const { proposedAmount, network, inputToken, outputToken } = req.body;

      const mockParsedTx = {
        network: network || 'sepolia',
        swap: {
          inputToken: inputToken || { symbol: 'USDC', address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' },
          outputToken: outputToken || { symbol: 'WETH', address: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14' }
        }
      };

      const safetyResult = await executionSafetyService.validateExecution({
        userId,
        copyRule: { id: 'dry-run-rule', userId },
        parsedTx: mockParsedTx,
        proposedAmount: Number(proposedAmount) || 50,
        executionNetwork: network || 'sepolia'
      });

      return res.status(200).json({
        success: true,
        data: safetyResult
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ExecutionController();
