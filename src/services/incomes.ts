import { api } from './api';
import { ApiIncome } from '../types/api';
import { Income } from '../types';
import { apiToIncome, incomeToCreatePayload } from '../utils/incomeAdapter';

export const incomesApi = {
  async getAll(): Promise<Income[]> {
    const res = await api.get<{ incomes: ApiIncome[] }>('/incomes');
    if (res.success && res.data) {
      return res.data.incomes.map(apiToIncome);
    }
    return [];
  },

  async getById(id: string): Promise<Income | null> {
    const res = await api.get<{ income: ApiIncome }>(`/incomes/${id}`);
    if (res.success && res.data) {
      return apiToIncome(res.data.income);
    }
    return null;
  },

  async create(input: {
    amount: number;
    incomeCategoryId: number;
    description?: string;
  }): Promise<Income | null> {
    const payload = incomeToCreatePayload(input);
    const res = await api.post<{ income: ApiIncome }>('/incomes', payload);
    if (res.success && res.data) {
      return apiToIncome(res.data.income);
    }
    return null;
  },

  async update(
    id: string,
    patch: { amount?: number; incomeCategoryId?: number; description?: string },
  ): Promise<Income | null> {
    const res = await api.put<{ income: ApiIncome }>(`/incomes/${id}`, patch);
    if (res.success && res.data) {
      return apiToIncome(res.data.income);
    }
    return null;
  },

  async remove(id: string): Promise<boolean> {
    const res = await api.delete(`/incomes/${id}`);
    return res.success;
  },
};
