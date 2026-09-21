const mongoose = require('mongoose');
const env = require('./env');
const logger = require('../utils/logger');

let isConnected = false;
let connectionState = 'disconnected';

const connectDB = async () => {
  if (isConnected) {
    return;
  }

  try {
    connectionState = 'connecting';
    logger.info(`Attempting MongoDB connection to ${env.MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}...`);
    
    await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000
    });

    isConnected = true;
    connectionState = 'connected';
    logger.info('MongoDB connected successfully.');
  } catch (err) {
    isConnected = false;
    connectionState = 'disconnected';
    logger.warn(`MongoDB connection failed: ${err.message}. System running in degraded mode.`);
  }
};

mongoose.connection.on('connected', () => {
  isConnected = true;
  connectionState = 'connected';
  logger.info('MongoDB connection established');
});

mongoose.connection.on('error', (err) => {
  isConnected = false;
  connectionState = 'error';
  logger.error('MongoDB connection error:', err.message);
});

mongoose.connection.on('disconnected', () => {
  isConnected = false;
  connectionState = 'disconnected';
  logger.warn('MongoDB disconnected');
});

const getDBStatus = () => {
  const readyStates = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };

  const state = readyStates[mongoose.connection.readyState] || connectionState;
  return {
    status: state === 'connected' ? 'healthy' : 'degraded',
    state,
    host: mongoose.connection.host || null,
    name: mongoose.connection.name || null
  };
};

const disconnectDB = async () => {
  if (isConnected) {
    await mongoose.disconnect();
    isConnected = false;
    connectionState = 'disconnected';
    logger.info('MongoDB disconnected gracefully.');
  }
};

module.exports = {
  connectDB,
  disconnectDB,
  getDBStatus
};
