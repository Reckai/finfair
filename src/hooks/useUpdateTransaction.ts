import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Crypto from 'expo-crypto';
import { queryKeys } from '../query/queryKeys';
import { transactionsApi } from '../services/transactions';
import { outboxPush, outboxPendingCount } from '../db/outbox';
import { useAppStore } from '../store/useAppStore';
import { CreateTransactionPayload, Transaction } from '../types';

interface UpdateTransactionInput {
  id: string;
  patch: Partial<CreateTransactionPayload>;
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();
  const isOnline = useAppStore((s) => s.isOnline);
  const pairId = useAppStore((s) => s.pairId);
  const activeQueryKey = pairId ? queryKeys.transactions.pair : queryKeys.transactions.all;

  return useMutation({
    mutationFn: async (input: UpdateTransactionInput) => {
      if (isOnline) {
        const result = await transactionsApi.update(input.id, input.patch);
        if (!result) throw new Error('Failed to update transaction');
        return result;
      }
      return null;
    },
    onMutate: async ({ id, patch }) => {
      queryClient.cancelQueries({ queryKey: activeQueryKey });
      const previousTransactions = queryClient.getQueryData<Transaction[]>(activeQueryKey) || [];
      queryClient.setQueryData<Transaction[]>(activeQueryKey, (old = []) => {
        return old.map((tx) => {
          if (tx.id === id) {
            return {
              ...tx,
              ...patch,
              _pendingOutBoxId: isOnline ? undefined : tx.id,
            };
          }
          return tx;
        });
      });

      if (!isOnline) {
        outboxPush({
          entityType: 'transaction',
          action: 'update',
          payload: patch,
          entityId: id,
        });
        useAppStore.getState().setPendingOutboxCount(outboxPendingCount());
      }
      return { previousTransactions };
    },
    onSuccess: (serverTX, { id }) => {
      if (serverTX) {
        queryClient.setQueryData<Transaction[]>(activeQueryKey, (old = []) => {
          return old.map((tx) => (tx.id === id ? serverTX : tx));
        });
      }
    },
    onError: (_err, _imput, context) => {
      if (context?.previousTransactions) {
        queryClient.setQueryData<Transaction[]>(activeQueryKey, context.previousTransactions);
      }
    },
    onSettled: () => {
      if (isOnline) {
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.stats });
      }
    },
  });
}
