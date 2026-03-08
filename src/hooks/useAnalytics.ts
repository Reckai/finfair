import { useQuery } from '@tanstack/react-query';
import {
  analyticsApi,
  AnalyticsSummary,
  ExpenseByCategory,
  SankeyData,
  TrendEntry,
} from '../services/analytics';

export function useAnalyticsSummary(period: string) {
  return useQuery<AnalyticsSummary | null>({
    queryKey: ['analytics', 'summary', period],
    queryFn: () => analyticsApi.getSummary(period),
  });
}

export function useExpensesByCategory(period: string) {
  return useQuery<{ expensesByCategory: ExpenseByCategory[]; total: number } | null>({
    queryKey: ['analytics', 'expenses-by-category', period],
    queryFn: () => analyticsApi.getExpensesByCategory(period),
  });
}

export function useSankeyData(period: string) {
  return useQuery<SankeyData | null>({
    queryKey: ['analytics', 'sankey', period],
    queryFn: () => analyticsApi.getSankey(period),
  });
}

export function useTrend(months?: number) {
  return useQuery<TrendEntry[]>({
    queryKey: ['analytics', 'trend', months],
    queryFn: () => analyticsApi.getTrend(months),
  });
}
