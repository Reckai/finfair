import { api } from './api';
import { ApiTransaction, CreateTransactionPayload } from '../types/api';
import { Transaction } from '../types';
import { apiToTransaction, transactionToCreatePayload } from '../utils/transactionAdapter';

export const transactionsApi = {
  async getAll(): Promise<Transaction[]> {
    const res = await api.get<{transactions: ApiTransaction[]}>('/transactions');
    if (res.success && res.data) {
      return res.data.transactions.map(apiToTransaction);
    }
    return [];
  },

  async getAllPair(): Promise<Transaction[]> {
    const res = await api.get<{transactions: ApiTransaction[]}>('/transactions/pair');
    if (res.success && res.data) {
      return res.data.transactions.map(apiToTransaction);
    }
    return [];
  },

  async create(
    tx: Pick<Transaction, 'amount' | 'categoryId' | 'splitMode'> & { description?: string; pairId?: string }
  ): Promise<Transaction | null> {
    const payload = transactionToCreatePayload(tx);
    const res = await api.post<{transaction: ApiTransaction}>('/transactions', payload);
    if (res.success && res.data) {
      return apiToTransaction(res.data.transaction);
    }
    return null;
  },

  async update(id: string, patch: Partial<CreateTransactionPayload>): Promise<Transaction | null> {
    const res = await api.put<{transaction: ApiTransaction}>(`/transactions/${id}`, patch);
    if (res.success && res.data) {
      return apiToTransaction(res.data.transaction);
    }
    return null;
  },

  async remove(id: string): Promise<boolean> {
    const res = await api.delete(`/transactions/${id}`);
    return res.success;
  },
};
