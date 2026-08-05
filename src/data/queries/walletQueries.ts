import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useWalletRepository } from '../context/RepositoriesProvider';
import { queryKeys } from './keys';
import { USE_WDK } from '../source';
import { useWdkBalances, useWdkAccount, useWdkTransactions } from '@/wdk/hooks/useWalletData';

/**
 * App data hooks. Screens import THESE (never WDK or the mock directly).
 * Each delegates to the mock (via TanStack Query) or the WDK-backed hooks,
 * based on the USE_WDK flag in '@/data/source'. Both hooks always run to
 * satisfy the rules of hooks; we return whichever the flag selects.
 */

export function useAccounts() {
  const repo = useWalletRepository();
  const mock = useQuery({
    queryKey: queryKeys.wallet.accounts,
    queryFn: () => repo.listAccounts(),
    enabled: !USE_WDK,
  });
  const wdkAccount = useWdkAccount();
  if (!USE_WDK) return mock;
  // Map the single WDK account into the array shape screens expect.
  return {
    data: wdkAccount.data ? [wdkAccount.data] : [],
    isLoading: wdkAccount.isLoading,
    isError: wdkAccount.isError,
    refetch: () => {},
  };
}

export function useBalances(_accountId: string) {
  const repo = useWalletRepository();
  const mock = useQuery({
    queryKey: queryKeys.wallet.balances(_accountId),
    queryFn: () => repo.getBalances(_accountId),
    enabled: !USE_WDK && !!_accountId,
  });
  const wdk = useWdkBalances();
  return USE_WDK ? wdk : mock;
}

export function useTransactions(_accountId: string) {
  const repo = useWalletRepository();
  const mock = useQuery({
    queryKey: queryKeys.wallet.transactions(_accountId),
    queryFn: () => repo.getTransactions(_accountId),
    enabled: !USE_WDK && !!_accountId,
  });
  const wdk = useWdkTransactions();
  return USE_WDK ? wdk : mock;
}

export function useHasWallet() {
  const repo = useWalletRepository();
  return useQuery({
    queryKey: queryKeys.wallet.exists,
    queryFn: () => repo.hasWallet(),
    enabled: !USE_WDK,
  });
}

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
