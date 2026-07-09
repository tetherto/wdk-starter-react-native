/**
 * Centralized query keys. Using a factory keeps keys consistent across hooks
 * and makes cache invalidation predictable (e.g. after a send, invalidate
 * balances + transactions for the account).
 */
export const queryKeys = {
  wallet: {
    exists: ['wallet', 'exists'] as const,
    accounts: ['wallet', 'accounts'] as const,
    balances: (accountId: string) => ['wallet', 'balances', accountId] as const,
    transactions: (accountId: string) => ['wallet', 'transactions', accountId] as const,
  },
};
