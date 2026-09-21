const path = require('path');
const dotenv = require('dotenv');

// Load .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const requiredEnvVars = ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];

// Validate critical variables in production
if (process.env.NODE_ENV === 'production') {
  for (const varName of requiredEnvVars) {
    if (!process.env[varName]) {
      throw new Error(`CRITICAL CONFIG ERROR: Missing environment variable ${varName}`);
    }
  }
}

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 5000,
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/copy_trading_db',
  
  // JWT
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'dev_jwt_access_secret_do_not_use_in_production_32_chars',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'dev_jwt_refresh_secret_do_not_use_in_production_32_chars',
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',

  // Security & Cookies
  COOKIE_SECRET: process.env.COOKIE_SECRET || 'dev_cookie_signing_secret_do_not_use_in_prod_32_chars',
  SECURE_COOKIES: process.env.SECURE_COOKIES === 'true' || process.env.NODE_ENV === 'production',

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 mins
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
  AUTH_RATE_LIMIT_MAX: parseInt(process.env.AUTH_RATE_LIMIT_MAX, 10) || 20,

  // Phase 3 Blockchain RPC Providers
  ETHEREUM_RPC_URL: process.env.ETHEREUM_RPC_URL || 'https://rpc.flashbots.net',
  BASE_RPC_URL: process.env.BASE_RPC_URL || 'https://mainnet.base.org',
  POLYGON_RPC_URL: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com',
  SOLANA_RPC_URL: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',

  // Monitoring Scheduler Configuration
  MONITORING_ENABLED: process.env.MONITORING_ENABLED !== 'false',
  MONITORING_INTERVAL_MS: parseInt(process.env.MONITORING_INTERVAL_MS, 10) || 30000,
  MONITORING_MAX_CONCURRENCY: parseInt(process.env.MONITORING_MAX_CONCURRENCY, 10) || 3,
  MONITORING_MAX_BLOCK_RANGE: parseInt(process.env.MONITORING_MAX_BLOCK_RANGE, 10) || 50,
  RPC_TIMEOUT_MS: parseInt(process.env.RPC_TIMEOUT_MS, 10) || 8000,
  RPC_MAX_RETRIES: parseInt(process.env.RPC_MAX_RETRIES, 10) || 2,

  // Phase 8 Testnet Blockchain Execution
  TESTNET_EXECUTION_ENABLED: process.env.TESTNET_EXECUTION_ENABLED === 'true',
  TESTNET_SEPOLIA_RPC_URL: process.env.TESTNET_SEPOLIA_RPC_URL || 'https://rpc.sepolia.org',
  TESTNET_BASE_SEPOLIA_RPC_URL: process.env.TESTNET_BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org',
  TESTNET_POLYGON_AMOY_RPC_URL: process.env.TESTNET_POLYGON_AMOY_RPC_URL || 'https://rpc-amoy.polygon.technology',
  TESTNET_EXECUTION_PRIVATE_KEY: process.env.TESTNET_EXECUTION_PRIVATE_KEY || null,
  TESTNET_DEFAULT_MAX_GAS_GWEI: parseInt(process.env.TESTNET_DEFAULT_MAX_GAS_GWEI, 10) || 50,

  isProduction: () => (process.env.NODE_ENV || 'development') === 'production',
  isDevelopment: () => (process.env.NODE_ENV || 'development') === 'development'
};

module.exports = env;
