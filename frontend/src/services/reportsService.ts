// ============================================================================
// Reports Service
// ============================================================================

import api from './api';
import type { Report } from '@/types/esg';

export const reportsService = {
  generateReport: async (data: any): Promise<Report> => {
    const response = await api.post<Report>('/reports/generate', data);
    return response.data;
  },

  getReports: async (): Promise<any[]> => {
    try {
      const response = await api.get('/reports');
      const data = response.data;
      return Array.isArray(data) ? data : data?.items || data?.reports || [];
    } catch (err: any) {
      // GET /reports not yet implemented on backend — return empty list gracefully
      if (err?.response?.status === 404 || err?.response?.status === 405) {
        return [];
      }
      throw err;
    }
  },

  downloadReport: async (reportId: string): Promise<Blob> => {
    const response = await api.get(`/reports/${reportId}/download`, {
      responseType: 'blob',
    });

    let blob: Blob = response.data;
    const contentType = response.headers?.['content-type'];

    // If backend returns text/plain or empty type, force a PDF blob
    if (!blob.type || blob.type === 'text/plain') {
      blob = new Blob([blob], {
        type: contentType && contentType.includes('pdf')
          ? 'application/pdf'
          : 'application/pdf',
      });
    }

    return blob;
  },

  scheduleReport: async (data: any) => {
    const response = await api.post('/reports/schedule', data);
    return response.data;
  },
};

export default reportsService;
