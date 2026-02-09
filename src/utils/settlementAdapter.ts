import { ApiSettlement } from '../types/api';
import { Settlement } from '../types';

export function apiToSettlement(apiS: ApiSettlement): Settlement {
  return {
    id: apiS.id,
    amount: parseFloat(apiS.amount),
    payerId: apiS.payerId,
    payeeId: apiS.payeeId,
    pairId: apiS.pairId,
    description: apiS.description ?? undefined,
    createdAt: apiS.createdAt,
  };
}
