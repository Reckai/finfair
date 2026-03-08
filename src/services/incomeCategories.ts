import { api } from './api';
import { ApiIncomeCategory } from '../types/api';
import { IncomeCategory } from '../types';

export const incomeCategoriesApi = {
  async getAll(): Promise<IncomeCategory[]> {
    const res = await api.get<{ incomeCategories: ApiIncomeCategory[] }>('/income-categories');
    if (res.success && res.data) {
      return res.data.incomeCategories;
    }
    return [];
  },
};
