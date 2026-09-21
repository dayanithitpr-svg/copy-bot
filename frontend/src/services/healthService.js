import api from './api';

export const healthService = {
  async getHealth() {
    try {
      const response = await api.get('/health');
      return response.data;
    } catch (error) {
      return {
        status: 'error',
        error: error.response?.data?.message || error.message || 'Backend unreachable',
        timestamp: new Date().toISOString(),
      };
    }
  },
};
