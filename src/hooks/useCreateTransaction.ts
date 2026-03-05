import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Crypto from 'expo-crypto';
import { queryKeys } from '../query/queryKeys';
import { transactionsApi } from '../services/transactions';
import { outboxPush, outboxPendingCount } from '../db/outbox';
import { useAppStore } from '../store/useAppStore';
import { Transaction } from '../types';

interface CreateTransactionInput {
  amount: number;
  categoryId: number;
  splitMode: 'PERSONAL' | 'PARTNER' | 'HALF' | 'CUSTOM';
  description?: string;
  pairId?: string;
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  const isOnline = useAppStore((s) => s.isOnline);
  const pairId = useAppStore((s) => s.pairId);
  const user = useAppStore((s) => s.user);
  const activeQueryKey = pairId ? queryKeys.transactions.pair : queryKeys.transactions.all;
  return useMutation({
    mutationFn: async (input: CreateTransactionInput) => {
      if (isOnline) {
        const result = await transactionsApi.create(input);
        if (!result) throw new Error('Failed to create transaction');
        return result;
      }
      return null;
    },
    onMutate: async (inputCreateTransactionInput) => {
      queryClient.cancelQueries({ queryKey: activeQueryKey });

      const previousTransactions = queryClient.getQueryData<Transaction[]>(activeQueryKey) || [];
      const tempId = `temp-${Crypto.randomUUID()}`;
      const newTransaction: Transaction = {
        id: tempId,
        userId: user?.id ?? '',
        amount: inputCreateTransactionInput.amount,
        categoryId: inputCreateTransactionInput.categoryId,
        splitMode: inputCreateTransactionInput.splitMode,
        description: inputCreateTransactionInput.description,
        pairId: inputCreateTransactionInput.pairId ?? pairId ?? undefined,
        createdAt: new Date().toISOString(),
        _pendingOutBoxId: tempId,
      };
      queryClient.setQueryData(activeQueryKey, [newTransaction, ...previousTransactions]);
      if (!isOnline) {
        outboxPush({
          entityType: 'transaction',
          action: 'create',
          payload: newTransaction,
          tempId,
        });
        useAppStore.getState().setPendingOutboxCount(outboxPendingCount());
      }
      return { previousTransactions, tempId };
    },
    onSuccess: (serverTX, _input, context) => {
      if (serverTX && context) {
        const tempId = context.tempId;
        queryClient.setQueryData<Transaction[]>(activeQueryKey, (old = []) => {
          {
            return old?.map((tx) => (tx.id === tempId ? serverTX : tx)) || [];
          }
        });
      }
    },
    onError: (_error, _input, context) => {
      if (context?.previousTransactions) {
        queryClient.setQueryData(activeQueryKey, context.previousTransactions);
      }
    },
    onSettled: () => {
      if (isOnline) {
        queryClient.invalidateQueries({ queryKey: activeQueryKey });
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.stats });
      }
    },
  });
}
