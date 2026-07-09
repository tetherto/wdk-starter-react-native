import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useWalletRepository } from '../context/RepositoriesProvider';
import { queryKeys } from './keys';

/** Whether a wallet exists in storage. */
export function useHasWallet() {
  const repo = useWalletRepository();
  return useQuery({
    queryKey: queryKeys.wallet.exists,
    queryFn: () => repo.hasWallet(),
  });
}

/** All accounts. */
export function useAccounts() {
  const repo = useWalletRepository();
  return useQuery({
    queryKey: queryKeys.wallet.accounts,
    queryFn: () => repo.listAccounts(),
  });
}

/** Token balances for an account. */
export function useBalances(accountId: string) {
  const repo = useWalletRepository();
  return useQuery({
    queryKey: queryKeys.wallet.balances(accountId),
    queryFn: () => repo.getBalances(accountId),
    enabled: !!accountId,
  });
}

/** Transactions for an account. */
export function useTransactions(accountId: string) {
  const repo = useWalletRepository();
  return useQuery({
    queryKey: queryKeys.wallet.transactions(accountId),
    queryFn: () => repo.getTransactions(accountId),
    enabled: !!accountId,
  });
}

/** Create a wallet; invalidates existence + accounts on success. */
export function useCreateWallet() {
  const repo = useWalletRepository();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => repo.createWallet(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.wallet.exists });
      qc.invalidateQueries({ queryKey: queryKeys.wallet.accounts });
    },
  });
}
