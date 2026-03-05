export type BudgetType = 'NEED' | 'WANT' | 'SAVING';

export interface ApiCategory {
  id: number;
  name: string;
  iconName: string;
  color: string;
  isSystem: boolean;
  parentId?: number | null;
  budgetType?: BudgetType;
  subcategories?: ApiCategory[];
}

export interface ApiTransaction {
  id: string;
  amount: string;
  categoryId: number;
  description: string | null;
  splitMode: 'PERSONAL' | 'PARTNER' | 'HALF';
  source: 'APP' | 'TELEGRAM';
  userId: string;
  pairId: string | null;
  createdAt: string;
  category?: ApiCategory;
}

export interface CreateTransactionPayload {
  amount: number;
  categoryId: number;
  splitMode: 'PERSONAL' | 'PARTNER' | 'HALF';
  description?: string;
  pairId?: string;
}

export interface ByCategory {
  categoryId: number;
  name: string;
  color: string;
  amount: number;
}
export interface ApiChartData {
  byCategory: ByCategory[];
  totalTrueSpend: number;
}

export interface ApiSettlement {
  id: string;
  amount: string;
  description: string | null;
  payerId: string;
  payeeId: string;
  pairId: string;
  createdAt: string;
  payer?: {
    id: string;
    firstName: string;
    lastName?: string;
    username?: string;
    avatarUrl?: string | null;
  };
  payee?: {
    id: string;
    firstName: string;
    lastName?: string;
    username?: string;
    avatarUrl?: string | null;
  };
}

export interface CreateSettlementPayload {
  amount: number;
  payeeId: string;
  description?: string;
}

export interface ApiDashboardStats {
  balance: {
    netBalance: number;
    trueSpend: number;
    partnerSpend: number;
    totalPaid: number;
  };
  categoryBreakdown: { categoryId: number; amount: number }[];
  recentTransactions: ApiTransaction[];
  partner: {
    id: string;
    firstName: string;
    lastName: string | null;
    username: string | null;
    avatarUrl: string | null;
  } | null;
}

export interface ApiBalanceResponse {
  userA: {
    id: string;
    firstName: string;
    lastName: string | null;
    username: string | null;
    avatarUrl: string | null;
  };
  userB: {
    id: string;
    firstName: string;
    lastName: string | null;
    username: string | null;
    avatarUrl: string | null;
  };
  amount: number;
  direction: { from: string; to: string } | null;
}
