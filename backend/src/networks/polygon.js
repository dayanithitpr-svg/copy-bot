/**
 * Polygon Network Specification & Validation
 */

const EVM_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

const polygonNetwork = {
  id: 'polygon',
  name: 'Polygon',
  symbol: 'POL',
  chainId: 137,
  explorerUrl: 'https://polygonscan.com',
  addressType: 'EVM',

  isValidAddress(address) {
    if (!address || typeof address !== 'string') return false;
    return EVM_ADDRESS_REGEX.test(address.trim());
  },

  normalizeAddress(address) {
    return address.trim().toLowerCase();
  }
};

module.exports = polygonNetwork;
