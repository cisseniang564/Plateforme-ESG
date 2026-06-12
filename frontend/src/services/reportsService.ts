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
      // Backend exposes scheduled reports at /reports/scheduled — no bare GET /reports exists
      const response = await api.get('/reports/scheduled');
      const data = response.data;
      const schedules: any[] = Array.isArray(data) ? data : data?.schedules || data?.items || data?.reports || [];
      return schedules;
    } catch (err: any) {
      // Graceful fallback — return empty list on any error
      return [];
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
