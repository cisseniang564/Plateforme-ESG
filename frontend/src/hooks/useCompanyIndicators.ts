import { useQuery } from '@tanstack/react-query';
import { indicatorsApi, CompanyIndicators } from '@/services/indicatorsApi';

export const useCompanyIndicators = (
  companyId: string | undefined,
  year?: number
) => {
  return useQuery<CompanyIndicators>({
    queryKey: ['company-indicators', companyId, year],
    queryFn: () => {
      if (!companyId) throw new Error('Company ID required');
      return indicatorsApi.getCompanyIndicators(companyId, year);
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
};
