import { api } from './api';
import { Pair } from '../types';

export const pairsApi = {
  create: () => api.post<{ pair: Pair; inviteCode: string }>('/pairs/create'),
  join: (inviteCode: string) => api.post<{ pair: Pair }>('/pairs/join', { inviteCode }),
  me: () => api.get<{ pair: string | null }>('/pairs/me'),
  leave: () => api.delete<{ success: boolean }>('/pairs/leave'),
};
