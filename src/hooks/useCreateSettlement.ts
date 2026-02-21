import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Crypto from 'expo-crypto';
import { queryKeys } from '../query/queryKeys';
import { settlementsApi } from '../services/settlements';
import { outboxPush, outboxPendingCount } from '../db/outbox';
import { useAppStore } from '../store/useAppStore';
import { Settlement, CreateSettlementPayload, ApiSettlement } from '../types';

export function useCreateSettlement() {
  const queryClient = useQueryClient();
  const isOnline = useAppStore((s) => s.isOnline);
  const pairId = useAppStore((s) => s.pairId);
  const user = useAppStore((s) => s.user);

  return useMutation({
    mutationFn: async (input: CreateSettlementPayload) => {
      if (isOnline) {
        const result = await settlementsApi.create(input);
        if (!result) throw new Error('Failed to create settlement');
        return result;
      }
      return null;
    },
    onMutate: async (input: CreateSettlementPayload) => {
      const tempId = `temp-${Crypto.randomUUID()}`;

      const previousSettlements = queryClient.getQueryData<Settlement[]>(queryKeys.settlements.all);
      const optimisticSettlement: Settlement = {
        id: tempId,
        pairId: pairId ?? '',
        amount: input.amount,
        payerId: user?.id ?? '',
        payeeId: input.payeeId,
        createdAt: new Date().toISOString(),
        _pendingOutBoxId: tempId,
        description: input.description,
      };
      queryClient.setQueryData<Settlement[]>(queryKeys.settlements.all, (old = []) => {
        return [optimisticSettlement, ...old];
      });

      if (!isOnline) {
        outboxPush({
          entityType: 'settlement',
          action: 'create',
          payload: input,
          tempId,
        });
        useAppStore.getState().setPendingOutboxCount(outboxPendingCount());
      }
      return { previousSettlements, tempId };
    },
    onSuccess: (serverSettlement, _input, context) => {
      if (serverSettlement && context) {
        queryClient.setQueryData<Settlement[]>(queryKeys.settlements.all, (old = []) => {
          return old.map((s) => (s.id === context.tempId ? serverSettlement : s));
        });
      }
    },
    onError: (_err, _input, context) => {
      if (context?.previousSettlements) {
        queryClient.setQueryData(queryKeys.settlements.all, context.previousSettlements);
      }
    },
    onSettled: () => {
      if (isOnline) {
        queryClient.invalidateQueries({ queryKey: queryKeys.settlements.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.stats });
      }
    },
  });
}
