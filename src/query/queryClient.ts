import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes,
      gcTime: 24 * 60 * 60 * 1000, // 24 hours,
      retry: (failureCount, error) => {
        if (isNetworkError(error)) return false;
        return failureCount < 3;
      },
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: false,
    },
  },
});

function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.message.includes('Network Error') || error.message.includes('timeout');
  }
  return false;
}
