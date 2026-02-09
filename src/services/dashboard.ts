import { api } from './api';
import { ApiDashboardStats } from '../types/api';

export const dashboardApi = {
  async getStats(): Promise<ApiDashboardStats | null> {
    const res = await api.get<ApiDashboardStats>('/dashboard/stats');
    if (res.success && res.data) {
      return res.data;
    }
    return null;
  },
};
