import api from './api';

export const copyTradingService = {
  /**
   * Get engine operational status
   */
  async getStatus() {
    const response = await api.get('/copy-trading/status');
    return response.data?.data;
  },

  /**
   * Get copy trading performance summary
   */
  async getSummary() {
    const response = await api.get('/copy-trading/summary');
    return response.data?.data;
  },

  /**
   * Get paginated copy trading decision stream
   */
  async getDecisions(filters = {}, page = 1, limit = 20) {
    const params = new URLSearchParams({ page, limit, ...filters });
    const response = await api.get(`/copy-trading/decisions?${params.toString()}`);
    return response.data;
  },

  /**
   * Manually process a specific parsed transaction through the copy trading engine
   */
  async processTransaction(transactionId) {
    const response = await api.post(`/copy-trading/process/${transactionId}`);
    return response.data;
  }
};

export default copyTradingService;
