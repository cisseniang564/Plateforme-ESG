import api from './api';

export interface KPI {
  code: string;
  label: string;
  value: number;
  unit: string;
  pillar: string;
  source: string;
  last_updated_at: string;
}

export interface CompanyIndicators {
  company_id: string;
  company_name: string;
  year?: number;
  kpis: KPI[];
  data_completeness: number;
  total_indicators: number;
}

export const indicatorsApi = {
  getCompanyIndicators: async (
    companyId: string,
    year?: number
  ): Promise<CompanyIndicators> => {
    const params = year ? { year } : {};
    const response = await api.get(`/companies/${companyId}/indicators`, { params });
    return response.data;
  },
};
