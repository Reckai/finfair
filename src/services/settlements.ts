import { api } from './api';
import { ApiSettlement, CreateSettlementPayload, ApiBalanceResponse 
  
} from '../types/api';
import { Settlement } from '../types';
import { apiToSettlement } from '../utils/settlementAdapter';

export const settlementsApi = {
  async getAll(): Promise<Settlement[]> {
    const res = await api.get<{ settlements: ApiSettlement[] }>('/settlements');
    if (res.success && res.data) {
      return res.data.settlements.map(apiToSettlement);
    }
    return [];
  },

  async create(payload: CreateSettlementPayload): Promise<Settlement | null> {
    const res = await api.post<{ settlement: ApiSettlement }>('/settlements', payload);
    if (res.success && res.data) {
      return apiToSettlement(res.data.settlement);
    }
    return null;
  },

  async remove(id: string): Promise<boolean> {
    const res = await api.delete(`/settlements/${id}`);
    return res.success;
  },


};
