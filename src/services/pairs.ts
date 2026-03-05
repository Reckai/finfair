import { api } from './api';
import { Pair } from '../types';

export const pairsApi = {
  create: () => api.post<{ pair: Pair; inviteCode: string }>('/pairs/create'),
  join: (inviteCode: string) => api.post<{ pair: Pair }>('/pairs/join', { inviteCode }),
  me: () =>
    api.get<{
      pair:
        | {
            id: string;
            inviteCode: string | null;
            inviteExpires: Date | null;
            createdAt: Date;
            debtRatio: string;
            debtRatioUserId: string | null;
          }
        | undefined;
    }>('/pairs/me'),
  leave: () => api.delete<{ success: boolean }>('/pairs/leave'),
};
