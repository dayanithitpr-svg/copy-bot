/**
 * Ethereum Network Specification & Validation
 */

const EVM_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

const ethereumNetwork = {
  id: 'ethereum',
  name: 'Ethereum',
  symbol: 'ETH',
  chainId: 1,
  explorerUrl: 'https://etherscan.io',
  addressType: 'EVM',

  /**
   * Validates Ethereum public address format
   * @param {string} address 
   * @returns {boolean}
   */
  isValidAddress(address) {
    if (!address || typeof address !== 'string') return false;
    return EVM_ADDRESS_REGEX.test(address.trim());
  },

  /**
   * Normalizes Ethereum address (standard lowercase for consistent indexing)
   * @param {string} address 
   * @returns {string}
   */
  normalizeAddress(address) {
    return address.trim().toLowerCase();
  }
};

module.exports = ethereumNetwork;
