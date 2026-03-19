// ============================================================================
// Audit Service
// ============================================================================

import api from './api';

export const auditService = {
  logAction: async (action: string, details: any): Promise<void> => {
    await api.post('/audit/log', { action, details, timestamp: new Date().toISOString() });
  },

  getAuditLogs: async (params?: any) => {
    const response = await api.get('/audit/logs', { params });
    return response.data;
  },
};

export default auditService;
