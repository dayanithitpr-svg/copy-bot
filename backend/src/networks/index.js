const ethereum = require('./ethereum');
const base = require('./base');
const polygon = require('./polygon');
const solana = require('./solana');

const networks = {
  [ethereum.id]: ethereum,
  [base.id]: base,
  [polygon.id]: polygon,
  [solana.id]: solana
};

const SUPPORTED_NETWORKS = Object.keys(networks);

const getNetwork = (networkId) => {
  if (!networkId || typeof networkId !== 'string') return null;
  return networks[networkId.toLowerCase()] || null;
};

const isValidNetwork = (networkId) => {
  if (!networkId || typeof networkId !== 'string') return false;
  return Boolean(networks[networkId.toLowerCase()]);
};

const validateWalletAddress = (networkId, address) => {
  const network = getNetwork(networkId);
  if (!network) {
    return {
      isValid: false,
      error: `Unsupported blockchain network: ${networkId}`
    };
  }

  const isValid = network.isValidAddress(address);
  return {
    isValid,
    error: isValid ? null : `Invalid public address format for ${network.name}`
  };
};

const normalizeWalletAddress = (networkId, address) => {
  const network = getNetwork(networkId);
  if (!network) return address ? address.trim() : '';
  return network.normalizeAddress(address);
};

const getAllNetworksMetadata = () => {
  return Object.values(networks).map((n) => ({
    id: n.id,
    name: n.name,
    symbol: n.symbol,
    addressType: n.addressType,
    explorerUrl: n.explorerUrl
  }));
};

module.exports = {
  networks,
  SUPPORTED_NETWORKS,
  getNetwork,
  isValidNetwork,
  validateWalletAddress,
  normalizeWalletAddress,
  getAllNetworksMetadata
};
