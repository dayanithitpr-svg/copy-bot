import api from './api';

export const paperTradingService = {
  /**
   * Get virtual paper portfolio (cash balance + token holdings)
   */
  async getPortfolio() {
    const response = await api.get('/paper/portfolio');
    return response.data?.data?.portfolio || { virtualCashBalance: 10000, holdings: [] };
  },

  /**
   * Reset virtual paper portfolio to default
   */
  async resetPortfolio(initialBalance = 10000) {
    const response = await api.post('/paper/reset', { initialBalance });
    return response.data?.data?.portfolio;
  },

  /**
   * List simulated and skipped paper trades
   */
  async getTrades({ page = 1, limit = 20, status = '', traderId = '', network = '' } = {}) {
    const params = new URLSearchParams();
    if (page) params.append('page', page);
    if (limit) params.append('limit', limit);
    if (status) params.append('status', status);
    if (traderId) params.append('traderId', traderId);
    if (network) params.append('network', network);

    const response = await api.get(`/paper/trades?${params.toString()}`);
    return response.data?.data || { items: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 1 } };
  },

  /**
   * Get single paper trade details
   */
  async getTradeById(id) {
    const response = await api.get(`/paper/trades/${id}`);
    return response.data?.data?.trade;
  },

  /**
   * Get summary simulation statistics
   */
  async getSummary() {
    const response = await api.get('/paper/summary');
    return response.data?.data || { virtualCashBalance: 10000, holdingsCount: 0, trades: { total: 0, simulated: 0, skipped: 0 } };
  }
};

export default paperTradingService;
