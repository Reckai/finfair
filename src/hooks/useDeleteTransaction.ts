import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../query/queryKeys';
import { transactionsApi } from '../services/transactions';
import { outboxPush, outboxPendingCount } from '../db/outbox';
import { useAppStore } from '../store/useAppStore';
import { Transaction } from '../types';

export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  const isOnline = useAppStore((s) => s.isOnline);
  const pairId = useAppStore((s) => s.pairId);
  const activeQueryKey = pairId ? queryKeys.transactions.pair : queryKeys.transactions.all;

  return useMutation({
    mutationFn: async (id: string) => {
      if (isOnline) {
        const result = await transactionsApi.remove(id);
        if (!result) throw new Error('Failed to delete transaction');
        return result;
      }
      return null;
    },
    onMutate: async (id) => {
      queryClient.cancelQueries({ queryKey: activeQueryKey });
      const previousTransactions = queryClient.getQueryData<Transaction[]>(activeQueryKey) || [];
      queryClient.setQueryData<Transaction[]>(activeQueryKey, (old = []) => {
        return old.filter((tx) => tx.id !== id);
      });

      if (!isOnline) {
        outboxPush({
          entityType: 'transaction',
          action: 'delete',
          entityId: id,
          payload: { id },
        });
        useAppStore.getState().setPendingOutboxCount(outboxPendingCount());
      }

      return { previousTransactions };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: activeQueryKey });
    },
    onError: (_error, _id, context) => {
      if (context?.previousTransactions) {
        queryClient.setQueryData(activeQueryKey, context.previousTransactions);
      }
    },
    onSettled: () => {
      if (isOnline) {
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.stats });
      }
    },
  });
}
