import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import BigNumber from 'bignumber.js';
import { useBalancesForWallet, useAccount, useWalletManager } from '@tetherto/wdk-react-native-core';
import { ASSETS, ASSET_MAP } from '../assets';
import { DEFAULT_WALLET_ID } from '../walletIdentity';
import { usePrices } from '../pricing';
import { fetchAllTransfers } from '../indexer';
import { useAccounts } from '@/state/accounts';
import type { Account, TokenBalance, ChainId, Transaction } from '@/domain/models';

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

// networkColor moved to wdk/chains.ts (as networkColorFor()), as part of
// unifying every genuinely UI-facing per-network fact into one registry —
// see that file's header comment. The two extra entries this map used to
// carry ('sepolia', 'tron') didn't correspond to any real internal
// network key this app actually uses (our key is always 'ethereum', never
// literally 'sepolia'; Tron isn't compiled into the worklet at all) —
// they weren't reachable, so they weren't carried forward.

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
  // staleTime: 0 — WDK's own default is 30 SECONDS (confirmed directly in
  // its source: DEFAULT_QUERY_STALE_TIME_MS = 30 * 1000). During that
  // window, a screen regaining focus (e.g. returning from a send, or
  // switching accounts) won't refetch even though the underlying balance
  // has genuinely changed — exactly the real bug reported: a completed
  // send not showing up on Home for up to 30s, and a recipient account's
  // balance staying stale even longer, only correcting itself on a full
  // app restart (which clears the cache entirely). Explicit refetch calls
  // (see wallet.tsx/accounts.tsx's useFocusEffect, and send/review.tsx's
  // post-send refetch) are the other half of this fix — this staleTime
  // change means those refetches actually take effect immediately instead
  // of being skipped as "still fresh."
  const { data, isLoading, isRefetching, error, refetch } = useBalancesForWallet(
    accountIndex,
    ASSETS,
    { enabled: true, staleTime: 0 },
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
      // Real bug fixed: a row that EXISTS but has success:false (e.g. an
      // RPC timeout on that specific network) has balance:null — and
      // toDisplay(null, decimals) produces "0", identical to a genuinely
      // empty wallet. Distinguishing "fetch failed" here is what makes it
      // possible to show an honest, actionable state instead of a
      // silently misleading $0 balance.
      const fetchFailed = row != null && row.success === false;
      const amount = fetchFailed ? '—' : toDisplay(row?.balance, asset.getDecimals());
      const price = prices[asset.getSymbol()];
      const fiatValue =
        fetchFailed || price == null ? '—' : formatUsd(new BigNumber(amount).multipliedBy(price));

      return {
        token: {
          id: asset.getId(),
          symbol: asset.getSymbol(),
          chain: networkToChain(asset.getNetwork()),
        },
        amount,
        fiatValue,
        fetchFailed,
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
    refetch: balances.refetch,
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
 * Transactions — real WDK Indexer API integration (see wdk/indexer.ts for
 * the client/mapping details and two honest, real limitations: native ETH
 * has no history via this API at all, and Ethereum currently means Sepolia
 * for this query specifically, matching this app's actual current config).
 *
 * Direction ('in'/'out') is derived by comparing each transfer's from/to
 * against the ACTIVE account's own address on that transfer's network —
 * the API itself doesn't return a direction field, only raw from/to.
 */
export function useWdkTransactions() {
  const activeIndex = useAccounts((s) => s.activeIndex);
  const bitcoin = useWdkAddressForAccountNetwork(activeIndex, 'bitcoin');
  const ethereum = useWdkAddressForAccountNetwork(activeIndex, 'ethereum');
  const arbitrum = useWdkAddressForAccountNetwork(activeIndex, 'arbitrum');
  const polygon = useWdkAddressForAccountNetwork(activeIndex, 'polygon');

  const addressesByNetwork: Record<string, string> = {
    bitcoin: bitcoin.address,
    ethereum: ethereum.address,
    arbitrum: arbitrum.address,
    polygon: polygon.address,
  };
  const addressesReady =
    !!bitcoin.address && !!ethereum.address && !!arbitrum.address && !!polygon.address;

  const symbols = useMemo(() => Array.from(new Set(ASSETS.map((a) => a.getSymbol()))), []);
  const { prices } = usePrices(symbols);

  const query = useQuery({
    queryKey: ['indexer-transfers', activeIndex, bitcoin.address, ethereum.address, arbitrum.address, polygon.address],
    queryFn: () => fetchAllTransfers(addressesByNetwork),
    enabled: addressesReady,
    staleTime: 30_000,
  });

  const data: Transaction[] = useMemo(() => {
    if (!query.data) return [];
    return query.data.map((t) => {
      const asset = ASSET_MAP.get(t.assetId);
      const myAddress = addressesByNetwork[asset?.getNetwork() ?? ''] ?? '';
      const isOutgoing = !!t.from && t.from.toLowerCase() === myAddress.toLowerCase();
      const direction: 'in' | 'out' = isOutgoing ? 'out' : 'in';
      const counterparty = (isOutgoing ? t.to : t.from) ?? '';

      // NOT shiftedBy(-decimals) here — real bug, confirmed against actual
      // on-chain data: a genuine $1 USDT transfer was displaying as
      // "0.000001", off by EXACTLY 10^6 — precisely USDT's own decimals
      // value, too exact to be coincidence. This indexer API appears to
      // return `amount` already as a human-readable decimal string (e.g.
      // "1" meaning 1 USDT), NOT raw base units the way WDK's own balance
      // hooks do (see toDisplay() above, which correctly DOES shift —
      // that's a different, WDK-native data source, not this one).
      // Applying our own decimals shift on TOP of an already-shifted value
      // was the double-application causing this. Reformatted only for
      // consistent display precision, no scaling.
      const decimals = asset?.getDecimals() ?? 0;
      const amount = new BigNumber(t.amount).toFixed(decimals);
      const price = asset ? prices[asset.getSymbol()] : null;
      const fiatValue = price != null ? `$${new BigNumber(amount).multipliedBy(price).toFixed(2)}` : '—';

      return {
        id: t.transactionHash,
        direction,
        token: {
          id: asset?.getId() ?? t.assetId,
          symbol: asset?.getSymbol() ?? '',
          chain: (asset?.getNetwork() ?? 'bitcoin') as ChainId,
        },
        amount,
        fiatValue,
        address: counterparty,
        // FIXED a real bug, and a real overconfident claim on my part: this
        // previously said "confirmed" that indexer timestamps are Unix
        // SECONDS, requiring *1000 for JS Date compatibility — that was
        // actually just an assumption based on common blockchain API
        // convention, never verified against a real response (no API key
        // available to check directly). It was wrong: real transactions
        // several days old were showing as "just now" and landing in
        // "Earlier" regardless of actual age — exactly what happens when an
        // already-millisecond timestamp gets multiplied by 1000 again,
        // landing absurdly far in the future and making now-minus-timestamp
        // deeply negative. Treating it as already-milliseconds instead.
        timestamp: t.timestamp,
        status: 'confirmed' as const,
        blockNumber: t.blockNumber ?? undefined,
      };
    });
  }, [query.data, prices]);

  return {
    data,
    isLoading: query.isLoading || !addressesReady,
    isError: query.isError,
    error: query.error as Error | null,
    refetch: query.refetch,
  };
}