const validateRiskUpdate = (data) => {
  const errors = [];

  if (data.maxTradeExposure !== undefined) {
    const val = Number(data.maxTradeExposure);
    if (isNaN(val) || val < 1) {
      errors.push('maxTradeExposure must be a number greater than or equal to 1');
    }
  }

  if (data.maxDailyExposure !== undefined) {
    const val = Number(data.maxDailyExposure);
    if (isNaN(val) || val < 1) {
      errors.push('maxDailyExposure must be a number greater than or equal to 1');
    }
  }

  if (data.maxPortfolioExposure !== undefined) {
    const val = Number(data.maxPortfolioExposure);
    if (isNaN(val) || val < 1 || val > 100) {
      errors.push('maxPortfolioExposure must be a percentage between 1 and 100');
    }
  }

  if (data.maxTraderAllocation !== undefined) {
    const val = Number(data.maxTraderAllocation);
    if (isNaN(val) || val < 1 || val > 100) {
      errors.push('maxTraderAllocation must be a percentage between 1 and 100');
    }
  }

  if (data.maxTokenAllocation !== undefined) {
    const val = Number(data.maxTokenAllocation);
    if (isNaN(val) || val < 1 || val > 100) {
      errors.push('maxTokenAllocation must be a percentage between 1 and 100');
    }
  }

  if (data.maxOpenPositions !== undefined) {
    const val = parseInt(data.maxOpenPositions, 10);
    if (isNaN(val) || val < 1 || val > 50) {
      errors.push('maxOpenPositions must be an integer between 1 and 50');
    }
  }

  if (data.minConfidence !== undefined) {
    if (!['HIGH', 'MEDIUM', 'LOW'].includes(data.minConfidence)) {
      errors.push('minConfidence must be HIGH, MEDIUM, or LOW');
    }
  }

  if (data.allowedNetworks !== undefined) {
    if (!Array.isArray(data.allowedNetworks)) {
      errors.push('allowedNetworks must be an array of network strings');
    }
  }

  if (data.blockedTokens !== undefined) {
    if (!Array.isArray(data.blockedTokens)) {
      errors.push('blockedTokens must be an array of token address strings');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

module.exports = {
  validateRiskUpdate
};
