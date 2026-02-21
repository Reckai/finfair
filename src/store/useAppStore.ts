import { create } from 'zustand';
import { User, Transaction, Settlement, BalanceState, AppSettings, Category } from '../types';
import { calculateBalance } from '../utils/debtCalculator';
import { fallbackCategories } from '../constants/categories';
import { cacheClear } from '../db/cache';
import { outboxClear } from '../db/outbox';

// --- Store interface ---
interface AppState {
  // State
  user: User | null;
  isLoading: boolean;
  transactions: Transaction[];
  settlements: Settlement[];
  categories: Category[];
  settings: AppSettings;
  pairId: string | null;
  isOnline: boolean;
  pendingOutboxCount: number;

  // Actions
  setUser: (user: User | null) => void;
  setLoading: (isLoading: boolean) => void;
  setTransactions: (transactions: Transaction[]) => void;
  addTransaction: (transaction: Transaction) => void;
  removeTransaction: (id: string) => void;
  setCategories: (categories: Category[]) => void;
  addSettlement: (settlement: Settlement) => void;
  setSettlements: (settlements: Settlement[]) => void;
  removeSettlement: (id: string) => void;
  setPartnerName: (name: string) => void;
  setPairId: (pairId: string | null) => void;
  logout: () => void;
  setIsOnline: (isOnline: boolean) => void;
  setPendingOutboxCount: (count: number) => void;
}

// --- Initial state ---
const initialState = {
  user: null as User | null,
  isLoading: true,
  transactions: [] as Transaction[],
  settlements: [] as Settlement[],
  categories: fallbackCategories,
  settings: {
    partnerName: 'Партнёр',
  },
  isOnline: true,
  pendingOutboxCount: 0,
  pairId: null as string | null,
};

// --- Create store ---
export const useAppStore = create<AppState>((set, get) => ({
  ...initialState,

  setUser: (user) => set({ user }),

  setLoading: (isLoading) => set({ isLoading }),

  setTransactions: (transactions) => set({ transactions }),

  addTransaction: (transaction) =>
    set((state) => ({
      transactions: [transaction, ...state.transactions],
    })),

  removeTransaction: (id) =>
    set((state) => ({
      transactions: state.transactions.filter((t) => t.id !== id),
    })),

  setCategories: (categories) => set({ categories }),

  addSettlement: (settlement) =>
    set((state) => ({
      settlements: [settlement, ...state.settlements],
    })),

  setSettlements: (settlements) => set({ settlements }),

  removeSettlement: (id) =>
    set((state) => ({
      settlements: state.settlements.filter((s) => s.id !== id),
    })),

  setPartnerName: (name) =>
    set((state) => ({
      settings: { ...state.settings, partnerName: name },
    })),

  setPairId: (pairId) => set({ pairId }),
  setIsOnline: (isOnline) => set({ isOnline }),
  setPendingOutboxCount: (count) => set({ pendingOutboxCount: count }),
  logout: () => {
    outboxClear();
    cacheClear();
    set({ ...initialState, isLoading: false });
  },
}));
