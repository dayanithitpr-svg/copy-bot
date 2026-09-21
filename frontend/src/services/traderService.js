import api from './api';

export const traderService = {
  /**
   * List tracked traders with optional filtering & pagination
   */
  async getTraders({ page = 1, limit = 20, network = '', status = '', search = '' } = {}) {
    const params = new URLSearchParams();
    if (page) params.append('page', page);
    if (limit) params.append('limit', limit);
    if (network) params.append('network', network);
    if (status) params.append('status', status);
    if (search) params.append('search', search);

    const response = await api.get(`/traders?${params.toString()}`);
    return response.data?.data || { items: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 1 } };
  },

  /**
   * Get trader summary counts
   */
  async getTraderSummary() {
    const response = await api.get('/traders/summary');
    return response.data?.data?.summary || { total: 0, active: 0, paused: 0 };
  },

  /**
   * Get supported networks metadata
   */
  async getNetworks() {
    const response = await api.get('/traders/networks');
    return response.data?.data?.networks || [];
  },

  /**
   * Get single trader by ID
   */
  async getTraderById(id) {
    const response = await api.get(`/traders/${id}`);
    return response.data?.data?.trader;
  },

  /**
   * Add a new tracked trader
   */
  async createTrader({ displayName, walletAddress, network, notes }) {
    const response = await api.post('/traders', {
      displayName,
      walletAddress,
      network,
      notes
    });
    return response.data?.data?.trader;
  },

  /**
   * Update trader info
   */
  async updateTrader(id, { displayName, notes, trackingEnabled, isTracking }) {
    const response = await api.patch(`/traders/${id}`, {
      displayName,
      notes,
      trackingEnabled: trackingEnabled !== undefined ? trackingEnabled : isTracking
    });
    return response.data?.data?.trader;
  },

  /**
   * Toggle tracking status (enable/pause)
   */
  async toggleTrackingStatus(id, trackingEnabled) {
    const response = await api.patch(`/traders/${id}/status`, {
      trackingEnabled
    });
    return response.data?.data?.trader;
  },

  /**
   * Remove a tracked trader
   */
  async deleteTrader(id) {
    const response = await api.delete(`/traders/${id}`);
    return response.data;
  },

  /**
   * Get on-chain activity for a specific trader (Phase 3)
   */
  async getTraderActivity(id, { page = 1, limit = 20, activityType = '', status = '' } = {}) {
    const params = new URLSearchParams();
    if (page) params.append('page', page);
    if (limit) params.append('limit', limit);
    if (activityType) params.append('activityType', activityType);
    if (status) params.append('status', status);

    const response = await api.get(`/traders/${id}/activity?${params.toString()}`);
    return response.data?.data || { items: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 1 } };
  },

  /**
   * Get monitoring status and checkpoints for a trader (Phase 3)
   */
  async getTraderMonitoringStatus(id) {
    const response = await api.get(`/traders/${id}/monitoring`);
    return response.data?.data;
  },

  /**
   * Get recent activities across all tracked traders (Phase 3 Dashboard)
   */
  async getRecentActivities({ page = 1, limit = 10 } = {}) {
    const params = new URLSearchParams();
    if (page) params.append('page', page);
    if (limit) params.append('limit', limit);

    const response = await api.get(`/traders/activity/recent?${params.toString()}`);
    return response.data?.data || { items: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 1 } };
  },

  // ==========================================
  // PHASE 4: TRANSACTIONS & PARSED TRADES
  // ==========================================

  /**
   * Get parsed transactions for a trader
   */
  async getTraderTransactions(id, { page = 1, limit = 20, classification = '', network = '', confidence = '' } = {}) {
    const params = new URLSearchParams();
    if (page) params.append('page', page);
    if (limit) params.append('limit', limit);
    if (classification) params.append('classification', classification);
    if (network) params.append('network', network);
    if (confidence) params.append('confidence', confidence);

    const response = await api.get(`/traders/${id}/transactions?${params.toString()}`);
    return response.data?.data || { items: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 1 } };
  },

  /**
   * Get parsed swaps for a trader
   */
  async getTraderSwaps(id, { page = 1, limit = 20 } = {}) {
    const params = new URLSearchParams();
    if (page) params.append('page', page);
    if (limit) params.append('limit', limit);

    const response = await api.get(`/traders/${id}/swaps?${params.toString()}`);
    return response.data?.data || { items: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 1 } };
  },

  /**
   * Get parsed transfers for a trader
   */
  async getTraderTransfers(id, { page = 1, limit = 20 } = {}) {
    const params = new URLSearchParams();
    if (page) params.append('page', page);
    if (limit) params.append('limit', limit);

    const response = await api.get(`/traders/${id}/transfers?${params.toString()}`);
    return response.data?.data || { items: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 1 } };
  },

  /**
   * Get recent parsed transactions across all traders (Phase 4 Activity Explorer / Dashboard)
   */
  async getRecentTransactions({ page = 1, limit = 15, classification = '', network = '' } = {}) {
    const params = new URLSearchParams();
    if (page) params.append('page', page);
    if (limit) params.append('limit', limit);
    if (classification) params.append('classification', classification);
    if (network) params.append('network', network);

    const response = await api.get(`/transactions/recent?${params.toString()}`);
    return response.data?.data || { items: [], pagination: { page: 1, limit: 15, total: 0, totalPages: 1 } };
  },

  /**
   * Get single parsed transaction by ID
   */
  async getTransactionById(id) {
    const response = await api.get(`/transactions/${id}`);
    return response.data?.data?.transaction;
  }
};

export default traderService;
