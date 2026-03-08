import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../query/queryKeys';
import { incomeCategoriesApi } from '../services/incomeCategories';
import { IncomeCategory } from '../types';

export function useIncomeCategories() {
  return useQuery<IncomeCategory[]>({
    queryKey: queryKeys.incomeCategories.all,
    queryFn: () => incomeCategoriesApi.getAll(),
    staleTime: 10 * 60 * 1000,
  });
}
