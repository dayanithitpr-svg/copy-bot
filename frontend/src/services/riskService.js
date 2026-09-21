import api from './api';

export const riskService = {
  /**
   * Get user's risk configuration
   */
  async getRiskConfig() {
    const response = await api.get('/risk');
    return response.data?.data;
  },

  /**
   * Update user's risk configuration
   */
  async updateRiskConfig(configData) {
    const response = await api.patch('/risk', configData);
    return response.data?.data;
  },

  /**
   * Dry-run risk evaluation
   */
  async evaluateDryRun(evalData) {
    const response = await api.post('/risk/evaluate', evalData);
    return response.data?.data;
  },

  /**
   * Get paginated risk evaluation audit history
   */
  async getRiskHistory(filters = {}, page = 1, limit = 20) {
    const params = new URLSearchParams({ page, limit, ...filters });
    const response = await api.get(`/risk/history?${params.toString()}`);
    return response.data;
  }
};

export default riskService;
