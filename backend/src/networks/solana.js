/**
 * Solana Network Specification & Validation
 */

// Base58 regex excluding 0, O, I, l
const SOLANA_ADDRESS_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

const solanaNetwork = {
  id: 'solana',
  name: 'Solana',
  symbol: 'SOL',
  chainId: null,
  explorerUrl: 'https://solscan.io',
  addressType: 'BASE58',

  /**
   * Validates Solana public address format
   * @param {string} address 
   * @returns {boolean}
   */
  isValidAddress(address) {
    if (!address || typeof address !== 'string') return false;
    return SOLANA_ADDRESS_REGEX.test(address.trim());
  },

  /**
   * Normalizes Solana address (preserves case for Base58)
   * @param {string} address 
   * @returns {string}
   */
  normalizeAddress(address) {
    return address.trim();
  }
};

module.exports = solanaNetwork;
