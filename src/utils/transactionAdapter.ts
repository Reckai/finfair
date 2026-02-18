import { ApiTransaction, CreateTransactionPayload } from '../types/api';
import { Transaction, Category } from '../types';

function apiCategoryToCategory(apiCat: ApiTransaction['category']): Category | undefined {
  if (!apiCat) return undefined;
  return {
    id: apiCat.id,
    name: apiCat.name,
    iconName: apiCat.iconName,
    color: apiCat.color,
    isSystem: apiCat.isSystem,
  };
}

export function apiToTransaction(apiTx: ApiTransaction): Transaction {
  return {
    id: apiTx.id,
    amount: parseFloat(apiTx.amount),
    categoryId: apiTx.categoryId,
    description: apiTx.description ?? undefined,
    splitMode: apiTx.splitMode,
    source: apiTx.source,
    userId: apiTx.userId,
    pairId: apiTx.pairId ?? undefined,
    createdAt: apiTx.createdAt,
    category: apiCategoryToCategory(apiTx.category),
  };
}

export function transactionToCreatePayload(
  tx: Pick<Transaction, 'amount' | 'categoryId' | 'splitMode'> & {
    description?: string;
    pairId?: string;
  },
): CreateTransactionPayload {
  const payload: CreateTransactionPayload = {
    amount: tx.amount,
    categoryId: tx.categoryId,
    splitMode: tx.splitMode,
  };
  if (tx.description) payload.description = tx.description;
  if (tx.pairId) payload.pairId = tx.pairId;
  return payload;
}
