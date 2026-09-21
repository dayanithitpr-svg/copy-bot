import api from './api';

export const systemService = {
  /**
   * Fetches public/safe system operational status
   */
  async getStatus() {
    const response = await api.get('/system/status');
    return response.data?.data;
  },

  /**
   * Fetches detailed liveness and readiness health status
   */
  async getHealth() {
    const response = await api.get('/health');
    return response.data?.data;
  },

  async getReadiness() {
    const response = await api.get('/health/readiness');
    return response.data;
  },

  /**
   * Fetches live platform metrics snapshot
   */
  async getMetrics() {
    const response = await api.get('/system/metrics');
    return response.data?.data;
  },

  /**
   * Toggles emergency kill switch
   * @param {boolean} active 
   * @param {string} [reason]
   */
  async setKillSwitch(active, reason) {
    const response = await api.post('/system/kill-switch', { active, reason });
    return response.data?.data;
  },

  /**
   * Triggers interrupted execution recovery scan
   */
  async triggerRecovery() {
    const response = await api.post('/system/recover');
    return response.data?.data;
  },

  /**
   * Fetches paginated audit logs for authenticated user
   */
  async getAuditLogs(filters = {}, page = 1, limit = 20) {
    const params = new URLSearchParams();
    if (filters.eventType) params.append('eventType', filters.eventType);
    if (filters.severity) params.append('severity', filters.severity);
    if (filters.resourceType) params.append('resourceType', filters.resourceType);
    params.append('page', page);
    params.append('limit', limit);

    const response = await api.get(`/audit/logs?${params.toString()}`);
    return response.data?.data;
  }
};
