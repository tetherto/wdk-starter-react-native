import { useMemo } from 'react';
import BigNumber from 'bignumber.js';
import { useBalancesForWallet, useAccount, useWalletManager } from '@tetherto/wdk-react-native-core';
import { ASSETS } from '../assets';
import { DEFAULT_WALLET_ID } from '../walletIdentity';
import { usePrices } from '../pricing';
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
 * Balances for the active wallet — one row per configured asset, with real
 * fiat values via usePrices() (CoinGecko). Prices are looked up by SYMBOL,
 * de-duplicated — USDT/USDT0 appear on multiple chains, but we only need to
 * fetch each distinct symbol's price once, not once per chain.
 */
export function useWdkBalances() {
  const { data, isLoading, isRefetching, error, refetch } = useBalancesForWallet(
    ACCOUNT_INDEX,
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

/** Total portfolio value in USD across every configured asset. */
export function useWdkTotalUsd() {
  const balances = useWdkBalances();

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

/**
 * The active account — DEFAULTS to the first configured network's address
 * (Bitcoin). For a SPECIFIC network's address (e.g. Receive), use
 * useWdkAddressForNetwork(network) instead.
 */
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

/** The account address for a SPECIFIC network (e.g. 'arbitrum', 'polygon'). */
export function useWdkAddressForNetwork(network: string) {
  const account = useAccount({ network, accountIndex: ACCOUNT_INDEX });
  return {
    address: account.address ?? '',
    isLoading: account.isLoading,
    isError: !!account.error,
    error: account.error,
  };
}

/**
 * Transactions — per the Phase 1 PRD, should use the WDK public indexer
 * service (docs.wdk.tether.io/tools/indexer-api/get-started/) — not yet
 * built; still returns empty.
 */
export function useWdkTransactions() {
  return { data: [] as unknown[], isLoading: false, isError: false, refetch: () => {} };
}
