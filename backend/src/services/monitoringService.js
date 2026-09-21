const traderRepository = require('../repositories/traderRepository');
const activityRepository = require('../repositories/activityRepository');
const parsedTransactionRepository = require('../repositories/parsedTransactionRepository');
const blockchainService = require('../blockchain/blockchainService');
const { TransactionParser } = require('../blockchain/parser/TransactionParser');
const copyTradingEngine = require('./copyTradingEngine');
const logger = require('../utils/logger');
const env = require('../config/env');

const maskAddress = (address) => {
  if (!address || address.length < 10) return address || '***';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

class MonitoringService {
  /**
   * Executes a single monitoring cycle across all active tracked traders
   * @returns {Promise<Object>}
   */
  async runMonitoringCycle() {
    const startTime = Date.now();
    let scannedCount = 0;
    let activityCount = 0;
    let errorCount = 0;

    try {
      const activeTraders = await traderRepository.findActiveTradersForMonitoring();
      if (!activeTraders || activeTraders.length === 0) {
        logger.debug('Monitoring cycle: No active tracked traders found');
        return { scannedCount: 0, activityCount: 0, errorCount: 0, durationMs: Date.now() - startTime };
      }

      logger.info(`Starting monitoring cycle for ${activeTraders.length} active trader(s)...`);

      // Process traders in controlled batches to prevent RPC rate limiting
      const batchSize = env.MONITORING_MAX_CONCURRENCY;
      for (let i = 0; i < activeTraders.length; i += batchSize) {
        const batch = activeTraders.slice(i, i + batchSize);
        const batchResults = await Promise.allSettled(
          batch.map((trader) => this.monitorTrader(trader))
        );

        for (const res of batchResults) {
          if (res.status === 'fulfilled') {
            scannedCount++;
            activityCount += res.value.newActivitiesCount;
          } else {
            errorCount++;
          }
        }
      }

      const durationMs = Date.now() - startTime;
      logger.info(`Monitoring cycle completed in ${durationMs}ms: Scanned ${scannedCount} traders, Detected ${activityCount} new activities, Errors: ${errorCount}`);

      return { scannedCount, activityCount, errorCount, durationMs };
    } catch (err) {
      logger.error('Monitoring cycle fatal error:', err.message);
      return { scannedCount, activityCount, errorCount: errorCount + 1, durationMs: Date.now() - startTime };
    }
  }

  /**
   * Scans and updates on-chain activity for a single trader
   * @param {Object} trader 
   */
  async monitorTrader(trader) {
    const traderId = trader._id || trader.id;
    const { network, walletAddress, lastScannedBlock, lastScannedSignature, userId } = trader;

    try {
      const scanResult = await blockchainService.scanWallet(network, walletAddress, {
        lastScannedBlock,
        lastScannedSignature
      });

      const { activities, newLatestBlock, newLatestSignature } = scanResult;
      let newActivitiesCount = 0;

      if (activities && activities.length > 0) {
        // 1. Process each raw activity through the Phase 4 TransactionParser
        const parsedRecords = activities.map((rawAct) => {
          const parsed = TransactionParser.parseTransaction(rawAct, network, walletAddress);
          return {
            ...parsed,
            userId,
            traderId
          };
        });

        // 2. Persist parsed transactions into ParsedTransaction collection (idempotent)
        newActivitiesCount = await parsedTransactionRepository.bulkInsertOrIgnore(parsedRecords);

        // 3. Trigger Phase 7 Copy Trading Engine for each parsed transaction
        for (const parsedRecord of parsedRecords) {
          try {
            await copyTradingEngine.processTransactionForRules(parsedRecord);
          } catch (simErr) {
            logger.warn(`Copy trading execution skipped for tx ${parsedRecord.transactionHash}: ${simErr.message}`);
          }
        }

        // 4. Also maintain backward compatibility with WalletActivity
        const activityRecords = activities.map((act) => ({
          ...act,
          userId,
          traderId
        }));
        await activityRepository.bulkInsertOrIgnore(activityRecords);

        logger.info(`Detected, parsed & simulated ${newActivitiesCount} on-chain activities for trader "${trader.displayName}" (${maskAddress(walletAddress)})`);
      }

      // Update checkpoint and status
      const checkpointUpdates = {
        monitoringStatus: 'ACTIVE',
        lastCheckedAt: new Date(),
        lastSuccessfulCheckAt: new Date(),
        lastErrorMessage: null
      };

      if (newLatestBlock !== undefined && newLatestBlock !== null) {
        checkpointUpdates.lastScannedBlock = newLatestBlock;
      }
      if (newLatestSignature) {
        checkpointUpdates.lastScannedSignature = newLatestSignature;
      }
      if (newActivitiesCount > 0) {
        checkpointUpdates.lastActivityAt = new Date();
      }

      await traderRepository.updateCheckpoint(traderId, checkpointUpdates);

      return { success: true, newActivitiesCount };
    } catch (err) {
      const errorMsg = `RPC error on ${network}: ${err.message}`;
      logger.warn(`Monitoring failed for trader ${traderId} (${maskAddress(walletAddress)}): ${errorMsg}`);
      await traderRepository.updateMonitoringError(traderId, errorMsg);
      throw err;
    }
  }
}

module.exports = new MonitoringService();
