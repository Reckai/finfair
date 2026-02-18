import { ApiChartData } from '../types/api';
import { api } from './api';

export const chartDataApi = {
  getChartData: () => api.get<ApiChartData>('/analytics/chart-data'),
};
