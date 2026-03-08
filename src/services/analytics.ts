import { api } from './api';

export interface AnalyticsSummary {
  period: string;
  totalIncome: number;
  totalExpense: number;
  balance: number;
  rule503020: {
    need: BucketStatus;
    want: BucketStatus;
    saving: BucketStatus;
  };
}

interface BucketStatus {
  target: number;
  actual: number;
  percent: number;
  targetPercent: number;
  status: 'UNDER' | 'OVER' | 'OK';
}

export interface ExpenseByCategory {
  categoryId: number;
  name: string;
  iconName: string;
  color: string;
  budgetType: string;
  total: number;
  percent: number;
  subcategories: { categoryId: number; name: string; total: number }[];
}

export interface IncomeByCategory {
  incomeCategoryId: number;
  name: string;
  iconName: string;
  color: string;
  total: number;
  percent: number;
}

export interface SankeyNode {
  id: string;
  label: string;
  type: 'income' | 'total' | 'bucket' | 'expense' | 'remainder';
}

export interface SankeyLink {
  source: string;
  target: string;
  value: number;
}

export interface SankeyData {
  nodes: SankeyNode[];
  links: SankeyLink[];
}

export interface TrendEntry {
  period: string;
  income: number;
  expense: number;
  balance: number;
}

export const analyticsApi = {
  async getSummary(period?: string): Promise<AnalyticsSummary | null> {
    const query = period ? `?period=${period}` : '';
    const res = await api.get<{ summary: AnalyticsSummary }>(`/analytics/summary${query}`);
    if (res.success && res.data) {
      return res.data.summary;
    }
    return null;
  },

  async getExpensesByCategory(period?: string): Promise<{
    expensesByCategory: ExpenseByCategory[];
    total: number;
  } | null> {
    const query = period ? `?period=${period}` : '';
    const res = await api.get<{
      expensesByCategory: ExpenseByCategory[];
      total: number;
    }>(`/analytics/expenses-by-category${query}`);
    if (res.success && res.data) {
      return res.data;
    }
    return null;
  },

  async getIncomeByCategory(period?: string): Promise<{
    incomeByCategory: IncomeByCategory[];
    total: number;
  } | null> {
    const query = period ? `?period=${period}` : '';
    const res = await api.get<{
      incomeByCategory: IncomeByCategory[];
      total: number;
    }>(`/analytics/income-by-category${query}`);
    if (res.success && res.data) {
      return res.data;
    }
    return null;
  },

  async getSankey(period?: string): Promise<SankeyData | null> {
    const query = period ? `?period=${period}` : '';
    const res = await api.get<{ sankey: SankeyData }>(`/analytics/sankey${query}`);
    if (res.success && res.data) {
      return res.data.sankey;
    }
    return null;
  },

  async getTrend(months?: number): Promise<TrendEntry[]> {
    const query = months ? `?months=${months}` : '';
    const res = await api.get<{ trend: TrendEntry[] }>(`/analytics/trend${query}`);
    if (res.success && res.data) {
      return res.data.trend;
    }
    return [];
  },
};
