import api from './api';

export const executionService = {
  /**
   * Get user's execution configuration
   */
  async getConfig() {
    const response = await api.get('/execution/config');
    return response.data?.data;
  },

  /**
   * Update user's execution configuration
   */
  async updateConfig(configData) {
    const response = await api.patch('/execution/config', configData);
    return response.data?.data;
  },

  /**
   * Get paginated testnet execution records
   */
  async getRecords(filters = {}, page = 1, limit = 20) {
    const cleanParams = {};
    if (page) cleanParams.page = page;
    if (limit) cleanParams.limit = limit;
    if (filters.network) cleanParams.network = filters.network;
    if (filters.status) cleanParams.status = filters.status;
    if (filters.traderId) cleanParams.traderId = filters.traderId;

    const query = new URLSearchParams(cleanParams).toString();
    const response = await api.get(`/execution/records?${query}`);
    return response.data;
  },

  /**
   * Get supported testnet networks and token allowlist
   */
  async getNetworks() {
    const response = await api.get('/execution/networks');
    return response.data?.data;
  },

  /**
   * Testnet pre-execution safety dry-run check
   */
  async validateDryRun(data) {
    const response = await api.post('/execution/dry-run', data);
    return response.data?.data;
  }
};

export default executionService;
