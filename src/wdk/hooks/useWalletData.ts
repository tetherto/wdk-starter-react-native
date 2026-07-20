import { useMemo } from 'react';
import BigNumber from 'bignumber.js';
import { useBalancesForWallet, useAccount, useWalletManager } from '@tetherto/wdk-react-native-core';
import { ASSETS } from '../assets';
import { DEFAULT_WALLET_ID } from '../walletIdentity';
import type { Account, TokenBalance, ChainId } from '@/domain/models';

/**
 * WDK-backed data hooks. Screens consume these; they never import WDK directly.
 * Each maps WDK's real hook output into the app's domain models.
 */

const ACCOUNT_INDEX = 0;

/** Brand color per chain, for the token glyph. Indexed by ChainId. */
export const networkColor: Record<string, string> = {
  bitcoin: '#F7931A',
  ethereum: '#627EEA',
  tron: '#FF060A',
};

function networkToChain(network: string): ChainId {
  if (network === 'ethereum') return 'ethereum';
  if (network === 'tron') return 'tron';
  return 'bitcoin';
}

function toDisplay(baseUnits: string | null | undefined, decimals: number): string {
  if (!baseUnits) return '0';
  return new BigNumber(baseUnits).shiftedBy(-decimals).toFixed();
}

/** Balances for the active wallet — one row per configured asset. */
export function useWdkBalances() {
  const { data, isLoading, isRefetching, error, refetch } = useBalancesForWallet(
    ACCOUNT_INDEX,
    ASSETS,
    { enabled: true },
  );

  const balances: TokenBalance[] = useMemo(() => {
    return ASSETS.map((asset) => {
      const row = data?.find(
        (b) => b.assetId === asset.getId() && b.network === asset.getNetwork(),
      );
      return {
        token: {
          id: asset.getId(),
          symbol: asset.getSymbol(),
          chain: networkToChain(asset.getNetwork()),
        },
        amount: toDisplay(row?.balance, asset.getDecimals()),
        fiatValue: '—',
      };
    });
  }, [data]);

  return { data: balances, isLoading, isRefetching, isError: !!error, error: error ?? null, refetch };
}

/** The active account (single account, first network). */
export function useWdkAccount() {
  const { activeWalletId, status } = useWalletManager();
  const primary = ASSETS[0];
  const account = useAccount({ network: primary.getNetwork(), accountIndex: ACCOUNT_INDEX });

  const data: Account | null = activeWalletId
    ? {
        id: String(ACCOUNT_INDEX),
        name: 'Account 1',
        address: account.address ?? '',
        fiatTotal: '—',
      }
    : null;

  return {
    data,
    isLoading: status === 'LOADING' || account.isLoading,
    isError: !!account.error,
    error: account.error,
  };
}

/** Transactions — WDK core has no unified history API yet; empty for now. */
export function useWdkTransactions() {
  return { data: [] as unknown[], isLoading: false, isError: false, refetch: () => {} };
}
