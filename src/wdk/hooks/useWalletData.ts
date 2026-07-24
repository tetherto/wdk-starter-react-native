import { useMemo } from 'react';
import BigNumber from 'bignumber.js';
import { useBalancesForWallet, useAccount, useWalletManager } from '@tetherto/wdk-react-native-core';
import { ASSETS } from '../assets';
import { DEFAULT_WALLET_ID } from '../walletIdentity';
import { usePrices } from '../pricing';
import { useAccounts } from '@/state/accounts';
import type { Account, TokenBalance, ChainId } from '@/domain/models';

/**
 * WDK-backed data hooks. Screens consume these; they never import WDK directly.
 * Each maps WDK's real hook output into the app's domain models.
 *
 * MULTI-ACCOUNT: every hook below now reads the ACTIVE account index from
 * useAccounts() (src/state/accounts.ts) instead of a hardcoded 0. WDK itself
 * has no concept of "which account is active" — that's this app's own
 * state; WDK just derives correctly for whatever index it's given. Hooks
 * that need an ARBITRARY (not-necessarily-active) account's data — e.g. the
 * Accounts screen showing every account's own total — take an explicit
 * accountIndex argument instead (useWdkBalancesForAccount,
 * useWdkAddressForAccountNetwork) rather than assuming "active".
 */

/** Brand color per chain, for the token glyph. Indexed by ChainId. */
export const networkColor: Record<string, string> = {
  bitcoin: '#F7931A',
  ethereum: '#627EEA',
  arbitrum: '#28A0F0',
  polygon: '#8247E5',
  sepolia: '#CFCFEA', // muted variant of Ethereum blue, signals "testnet"
  tron: '#FF060A',
};

function networkToChain(network: string): ChainId {
  switch (network) {
    case 'ethereum': return 'ethereum';
    case 'arbitrum': return 'arbitrum';
    case 'polygon': return 'polygon';
    case 'sepolia': return 'sepolia';
    case 'tron': return 'tron';
    default: return 'bitcoin';
  }
}

function toDisplay(baseUnits: string | null | undefined, decimals: number): string {
  if (!baseUnits) return '0';
  return new BigNumber(baseUnits).shiftedBy(-decimals).toFixed();
}

function formatUsd(value: BigNumber | null): string {
  if (!value) return '—';
  return `$${value.toFormat(2)}`;
}

/**
 * Balances for a SPECIFIC account index — the shared core both the "active
 * account" hooks and the Accounts screen (which needs every account's own
 * totals, not just the active one) build on.
 */
export function useWdkBalancesForAccount(accountIndex: number) {
  const { data, isLoading, isRefetching, error, refetch } = useBalancesForWallet(
    accountIndex,
    ASSETS,
    { enabled: true },
  );

  const symbols = useMemo(
    () => Array.from(new Set(ASSETS.map((a) => a.getSymbol()))),
    [],
  );
  const { prices, isLoading: pricesLoading } = usePrices(symbols);

  const balances: TokenBalance[] = useMemo(() => {
    return ASSETS.map((asset) => {
      const row = data?.find(
        (b) => b.assetId === asset.getId() && b.network === asset.getNetwork(),
      );
      const amount = toDisplay(row?.balance, asset.getDecimals());
      const price = prices[asset.getSymbol()];
      const fiatValue =
        price != null ? formatUsd(new BigNumber(amount).multipliedBy(price)) : '—';

      return {
        token: {
          id: asset.getId(),
          symbol: asset.getSymbol(),
          chain: networkToChain(asset.getNetwork()),
        },
        amount,
        fiatValue,
      };
    });
  }, [data, prices]);

  return {
    data: balances,
    isLoading: isLoading || pricesLoading,
    isRefetching,
    isError: !!error,
    error: error ?? null,
    refetch,
  };
}

/** Total USD across every configured asset, for a SPECIFIC account index. */
export function useWdkTotalUsdForAccount(accountIndex: number) {
  const balances = useWdkBalancesForAccount(accountIndex);

  const total = useMemo(() => {
    if (balances.isLoading || !balances.data) return null;
    let sum = new BigNumber(0);
    let anyPriced = false;
    for (const b of balances.data) {
      if (b.fiatValue === '—') continue;
      anyPriced = true;
      sum = sum.plus(new BigNumber(b.fiatValue.replace(/[^0-9.-]/g, '')));
    }
    return anyPriced ? sum : null;
  }, [balances.data, balances.isLoading]);

  return {
    total: total ? formatUsd(total) : '—',
    isLoading: balances.isLoading,
  };
}

/** The address for a SPECIFIC account index on a SPECIFIC network — what
 * the Accounts screen's per-row address chip uses (always that row's own
 * account, regardless of which one is currently active). */
export function useWdkAddressForAccountNetwork(accountIndex: number, network: string) {
  const account = useAccount({ network, accountIndex });
  return {
    address: account.address ?? '',
    isLoading: account.isLoading,
    isError: !!account.error,
    error: account.error,
  };
}

// ─── Convenience wrappers for the CURRENTLY ACTIVE account ──────────────────
// These are what Home/Receive/Send use — they never touch accountIndex
// directly, they just get whatever's active right now.

/** Balances for the ACTIVE account — one row per configured asset. */
export function useWdkBalances() {
  const activeIndex = useAccounts((s) => s.activeIndex);
  return useWdkBalancesForAccount(activeIndex);
}

/** Total USD for the ACTIVE account. */
export function useWdkTotalUsd() {
  const activeIndex = useAccounts((s) => s.activeIndex);
  return useWdkTotalUsdForAccount(activeIndex);
}

/**
 * The ACTIVE account — its real persisted name (from useAccounts, since WDK
 * itself doesn't track names) and its address on the first configured
 * network. For a SPECIFIC network's address, use useWdkAddressForNetwork.
 */
export function useWdkAccount() {
  const { activeWalletId, status } = useWalletManager();
  const activeIndex = useAccounts((s) => s.activeIndex);
  const names = useAccounts((s) => s.names);
  const primary = ASSETS[0];
  const account = useAccount({ network: primary.getNetwork(), accountIndex: activeIndex });

  const data: Account | null = activeWalletId
    ? {
        id: String(activeIndex),
        name: names[activeIndex] ?? `Account ${activeIndex + 1}`,
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

/** The ACTIVE account's address on a SPECIFIC network (e.g. Receive). */
export function useWdkAddressForNetwork(network: string) {
  const activeIndex = useAccounts((s) => s.activeIndex);
  return useWdkAddressForAccountNetwork(activeIndex, network);
}

/**
 * Transactions — per the Phase 1 PRD, should use the WDK public indexer
 * service (docs.wdk.tether.io/tools/indexer-api/get-started/) — not yet
 * built; still returns empty. Will also need to scope by active account
 * once built, same as everything else here.
 */
export function useWdkTransactions() {
  return { data: [] as unknown[], isLoading: false, isError: false, refetch: () => {} };
}
