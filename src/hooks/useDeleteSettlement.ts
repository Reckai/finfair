import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../query/queryKeys';
import { settlementsApi } from '../services/settlements';
import { outboxPush, outboxPendingCount } from '../db/outbox';
import { useAppStore } from '../store/useAppStore';
import { Settlement } from '../types';

export function useDeleteSettlements() {
  const queryClient = useQueryClient();
  const isOnline = useAppStore((s) => s.isOnline);
  const pairId = useAppStore((s) => s.pairId);

  return useMutation({
    mutationFn: async (id: string) => {
      if (isOnline) {
        const result = await settlementsApi.remove(id);
        if (!result) throw new Error('Failed to delete settlement');
        return result;
      }
      return null;
    },
    onMutate: (id) => {
      queryClient.cancelQueries({ queryKey: queryKeys.settlements.all });
      const previousSettlements = queryClient.getQueryData(queryKeys.settlements.all);
      queryClient.setQueryData<Settlement[]>(queryKeys.settlements.all, (old = []) => {
        return old.filter((s) => s.id === id);
      });
      if (!isOnline) {
        outboxPush({
          action: 'delete',
          entityType: 'settlement',
          payload: { id },
          entityId: id,
        });
        useAppStore.getState().setPendingOutboxCount(outboxPendingCount());
      }

      return { previousSettlements };
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
      }
    },
  });
}
