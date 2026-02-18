import { Transaction, Settlement, BalanceState } from '../types';

interface TransactionImpact {
  myExpense: number;
  partnerExpense: number;
  debtChange: number;
}

/**
 * Calculate the impact of a single transaction on personal expenses and debt.
 * Uses splitMode + userId instead of payerId/consumerId.
 *
 * Debt is from MY perspective:
 * - Positive debt = partner owes me money
 * - Negative debt = I owe partner money
 */
export function calculateTransactionImpact(
  tx: Transaction,
  currentUserId: string,
): TransactionImpact {
  const { amount, splitMode, userId } = tx;
  const isMine = userId === currentUserId;

  let myExpense = 0;
  let partnerExpense = 0;
  let debtChange = 0;

  switch (splitMode) {
    case 'PERSONAL':
      if (isMine) {
        // My personal expense — full amount, no debt
        myExpense = amount;
      } else {
        // Partner's personal expense — counts as partner spend
        partnerExpense = amount;
      }
      break;

    case 'PARTNER':
      if (isMine) {
        // I paid for partner — no expense for me, partner owes me full amount
        partnerExpense = amount;
        debtChange = amount;
      } else {
        // Partner paid for me — full expense, I owe partner
        myExpense = amount;
        debtChange = -amount;
      }
      break;

    case 'HALF':
      if (isMine) {
        // I paid, split 50/50 — my expense is half, partner owes me half
        myExpense = amount * 0.5;
        partnerExpense = amount * 0.5;
        debtChange = amount * 0.5;
      } else {
        // Partner paid, split 50/50 — my expense is half, I owe partner half
        myExpense = amount * 0.5;
        partnerExpense = amount * 0.5;
        debtChange = -(amount * 0.5);
      }
      break;
  }

  return { myExpense, partnerExpense, debtChange };
}

/**
 * Calculate the overall balance state from all transactions and settlements.
 * Requires currentUserId to distinguish "my" vs "partner" transactions.
 */
export function calculateBalance(
  transactions: Transaction[],
  settlements: Settlement[],
  currentUserId: string,
): BalanceState {
  let netBalance = 0;
  let trueSpend = 0;
  let partnerSpend = 0;
  let totalPaid = 0;

  for (const tx of transactions) {
    const impact = calculateTransactionImpact(tx, currentUserId);
    trueSpend += impact.myExpense;
    partnerSpend += impact.partnerExpense;
    netBalance += impact.debtChange;

    // Track total paid from my card
    if (tx.userId === currentUserId) {
      totalPaid += tx.amount;
    }
  }

  // Process settlements
  for (const settlement of settlements) {
    if (settlement.payerId === currentUserId) {
      // I paid partner → settles my debt → balance goes up
      netBalance += settlement.amount;
    } else if (settlement.payeeId === currentUserId) {
      // Partner paid me → settles their debt → balance goes down
      netBalance -= settlement.amount;
    }
  }

  return {
    netBalance,
    trueSpend,
    partnerSpend,
    totalPaid,
  };
}
