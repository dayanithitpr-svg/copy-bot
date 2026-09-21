import api from './api';

export const copyRuleService = {
  /**
   * List all copy rules for current user
   */
  async getRules() {
    const response = await api.get('/copy-rules');
    return response.data?.data?.copyRules || [];
  },

  /**
   * Create a new copy rule
   */
  async createRule(ruleData) {
    const response = await api.post('/copy-rules', ruleData);
    return response.data?.data?.copyRule;
  },

  /**
   * Get single copy rule by ID
   */
  async getRuleById(id) {
    const response = await api.get(`/copy-rules/${id}`);
    return response.data?.data?.copyRule;
  },

  /**
   * Update a copy rule
   */
  async updateRule(id, updateData) {
    const response = await api.patch(`/copy-rules/${id}`, updateData);
    return response.data?.data?.copyRule;
  },

  /**
   * Toggle enabled/disabled status
   */
  async toggleRule(id) {
    const response = await api.patch(`/copy-rules/${id}/toggle`);
    return response.data?.data?.copyRule;
  },

  /**
   * Delete a copy rule
   */
  async deleteRule(id) {
    const response = await api.delete(`/copy-rules/${id}`);
    return response.data;
  }
};

export default copyRuleService;
