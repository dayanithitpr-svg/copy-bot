const { EXECUTION_MODE } = require('../models/ExecutionConfig');
const executionNetworkRegistry = require('../blockchain/execution/executionNetworkRegistry');

/**
 * Validates execution config update payload
 * @param {Object} data 
 * @returns {{ isValid: boolean, errors: string[] }}
 */
const validateExecutionConfigUpdate = (data) => {
  const errors = [];

  if (data.mode !== undefined) {
    if (!Object.values(EXECUTION_MODE).includes(data.mode)) {
      errors.push(`Invalid execution mode '${data.mode}'. Must be one of: ${Object.values(EXECUTION_MODE).join(', ')}`);
    }
  }

  if (data.enabled !== undefined && typeof data.enabled !== 'boolean') {
    errors.push('enabled must be a boolean');
  }

  if (data.allowedNetworks !== undefined) {
    if (!Array.isArray(data.allowedNetworks)) {
      errors.push('allowedNetworks must be an array of network identifiers');
    } else {
      for (const net of data.allowedNetworks) {
        if (!executionNetworkRegistry.isExecutionAllowed(net)) {
          errors.push(`Network '${net}' is not an approved testnet. Mainnets and unapproved networks are strictly rejected.`);
        }
      }
    }
  }

  if (data.maxExecutionAmount !== undefined) {
    const val = Number(data.maxExecutionAmount);
    if (isNaN(val) || val <= 0 || val > 5000) {
      errors.push('maxExecutionAmount must be a positive number between 1 and 5000 USD/Testnet Tokens');
    }
  }

  if (data.maxDailyExecutionAmount !== undefined) {
    const val = Number(data.maxDailyExecutionAmount);
    if (isNaN(val) || val <= 0 || val > 20000) {
      errors.push('maxDailyExecutionAmount must be a positive number between 1 and 20000 USD/Testnet Tokens');
    }
  }

  if (data.maxGasCostGwei !== undefined) {
    const val = Number(data.maxGasCostGwei);
    if (isNaN(val) || val < 1 || val > 1000) {
      errors.push('maxGasCostGwei must be between 1 and 1000 Gwei');
    }
  }

  if (data.maxSlippageBps !== undefined) {
    const val = Number(data.maxSlippageBps);
    if (isNaN(val) || val < 10 || val > 500) {
      errors.push('maxSlippageBps must be between 10 (0.1%) and 500 (5.0%) basis points');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

module.exports = {
  validateExecutionConfigUpdate
};
