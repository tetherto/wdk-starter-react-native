import { QueryClient } from '@tanstack/react-query';

/**
 * Shared QueryClient. Defaults tuned for wallet data: retry network blips,
 * keep data fresh-ish but refetch on focus so balances update when the user
 * returns to a screen.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30_000,        // 30s: balances don't need to refetch on every render
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
  },
});
