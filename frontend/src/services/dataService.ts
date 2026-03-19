// ============================================================================
// Data Service
// ============================================================================

import api from './api';
import type { DataUpload } from '@/types/esg';

export const dataService = {
  uploadFile: async (file: File, organizationId: string): Promise<DataUpload> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('organization_id', organizationId);
    
    const response = await api.post<DataUpload>('/data/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  getDataQuality: async (uploadId: string) => {
    const response = await api.get(`/data/${uploadId}/quality`);
    return response.data;
  },

  getUploads: async () => {
    const response = await api.get('/data/uploads');
    return response.data;
  },
};

export default dataService;
