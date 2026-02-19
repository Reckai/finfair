export const queryKeys = {
  transactions: {
    all: ['transactions'] as const,
    pair: ['transactions', 'pair'] as const,
  },
  settlements: {
    all: ['settlements'] as const,
  },
  dashboard: {
    stats: ['dashboard', 'stats'] as const,
  },
} as const;
