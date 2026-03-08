import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Crypto from 'expo-crypto';
import { queryKeys } from '../query/queryKeys';
import { incomesApi } from '../services/incomes';
import { outboxPush, outboxPendingCount } from '../db/outbox';
import { useAppStore } from '../store/useAppStore';
import { Income } from '../types';

interface CreateIncomeInput {
  amount: number;
  incomeCategoryId: number;
  description?: string;
}

export function useCreateIncome() {
  const queryClient = useQueryClient();
  const isOnline = useAppStore((s) => s.isOnline);
  const user = useAppStore((s) => s.user);

  return useMutation({
    mutationFn: async (input: CreateIncomeInput) => {
      if (isOnline) {
        const result = await incomesApi.create(input);
        if (!result) throw new Error('Failed to create income');
        return result;
      }
      return null;
    },
    onMutate: async (input: CreateIncomeInput) => {
      queryClient.cancelQueries({ queryKey: queryKeys.incomes.all });

      const previousIncomes = queryClient.getQueryData<Income[]>(queryKeys.incomes.all) || [];
      const tempId = `temp-${Crypto.randomUUID()}`;
      const newIncome: Income = {
        id: tempId,
        userId: user?.id ?? '',
        amount: input.amount,
        incomeCategoryId: input.incomeCategoryId,
        description: input.description,
        source: 'APP',
        createdAt: new Date().toISOString(),
        _pendingOutBoxId: tempId,
      };
      queryClient.setQueryData(queryKeys.incomes.all, [newIncome, ...previousIncomes]);
      if (!isOnline) {
        outboxPush({
          entityType: 'income',
          action: 'create',
          payload: newIncome,
          tempId,
        });
        useAppStore.getState().setPendingOutboxCount(outboxPendingCount());
      }
      return { previousIncomes, tempId };
    },
    onSuccess: (serverIncome, _input, context) => {
      if (serverIncome && context) {
        const tempId = context.tempId;
        queryClient.setQueryData<Income[]>(queryKeys.incomes.all, (old = []) => {
          return old.map((inc) => (inc.id === tempId ? serverIncome : inc));
        });
      }
    },
    onError: (_error, _input, context) => {
      if (context?.previousIncomes) {
        queryClient.setQueryData(queryKeys.incomes.all, context.previousIncomes);
      }
    },
    onSettled: () => {
      if (isOnline) {
        queryClient.invalidateQueries({ queryKey: queryKeys.incomes.all });
      }
    },
  });
}
