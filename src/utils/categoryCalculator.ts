import { Transaction } from '../types';

export interface CategorySpend {
  categoryId: number;
  amount: number;
  parentId: number;
}

/**
 * Calculate spending breakdown by category.
 * Uses splitMode + userId to determine "my expense" per transaction.
 */
export function calculateCategoryBreakdown(
  transactions: Transaction[],
  currentUserId: string,
): CategorySpend[] {
  const categoryMap = new Map<number, number>();

  for (const tx of transactions) {
    const isMine = tx.userId === currentUserId;
    let myExpense = 0;

    switch (tx.splitMode) {
      case 'PERSONAL':
        if (isMine) myExpense = tx.amount;
        break;
      case 'PARTNER':
        if (!isMine) myExpense = tx.amount;
        break;
      case 'HALF':
        myExpense = tx.amount * 0.5;
        break;
    }

    if (myExpense > 0) {
      const current = categoryMap.get(tx.categoryId) || 0;
      categoryMap.set(tx.categoryId, current + myExpense);
    }
  }

  return Array.from(categoryMap.entries())
    .map(([categoryId, amount]) => ({ categoryId, amount }))
    .sort((a, b) => b.amount - a.amount);
}
