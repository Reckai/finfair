// Re-export API types
export type { ApiTransaction, ApiCategory, CreateTransactionPayload, ApiSettlement, CreateSettlementPayload, ApiBalanceResponse } from './api';

// Pair types
export interface Pair {
  id: string;
  inviteCode: string | null;
  inviteExpires: string | null;
  createdAt: string;
}

// User types
export interface User {
  id: string;
  telegramId: number;
  firstName: string;
  lastName?: string;
  username?: string;
  avatarUrl?: string;
  partnerId?: string;
}

// Split mode type
export type SplitMode = 'PERSONAL' | 'PARTNER' | 'HALF';

// App Settings
export interface AppSettings {
  partnerName: string;
}

// Transaction types
export interface Transaction {
  id: string;
  amount: number;
  categoryId: number;
  description?: string;
  splitMode: SplitMode;
  source?: 'APP' | 'TELEGRAM';
  userId: string;
  pairId?: string;
  createdAt: string;
  category?: Category;
}

// Category types
export interface Category {
  id: number;
  name: string;
  iconName: string;
  color: string;
  isSystem: boolean;
}

// Settlement types
export interface Settlement {
  id: string;
  amount: number;
  payerId: string;
  payeeId: string;
  pairId: string;
  description?: string;
  createdAt: string;
}

// Balance state
export interface BalanceState {
  netBalance: number;
  trueSpend: number;
  partnerSpend: number;
  totalPaid: number;
}


// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Navigation types
export type RootStackParamList = {
        Auth: {token?:string};
        Main: undefined;
      };

export type MainTabParamList = {
  Dashboard: undefined;
  AddTransaction: undefined;
  History: undefined;
  Settings: undefined;
};
 declare global {
    namespace ReactNavigation {
      interface RootParamList extends RootStackParamList {}
    }
  }