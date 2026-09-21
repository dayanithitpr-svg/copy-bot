/**
 * Base Network Specification & Validation
 */

const EVM_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

const baseNetwork = {
  id: 'base',
  name: 'Base',
  symbol: 'ETH',
  chainId: 8453,
  explorerUrl: 'https://basescan.org',
  addressType: 'EVM',

  isValidAddress(address) {
    if (!address || typeof address !== 'string') return false;
    return EVM_ADDRESS_REGEX.test(address.trim());
  },

  normalizeAddress(address) {
    return address.trim().toLowerCase();
  }
};

module.exports = baseNetwork;
