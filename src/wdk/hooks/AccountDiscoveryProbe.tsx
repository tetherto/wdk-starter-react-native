import { useEffect, useRef } from 'react';
import { useBalancesForWallet } from '@tetherto/wdk-react-native-core';
import { ASSETS } from '../assets';

interface ProbeProps {
  accountIndex: number;
  onResult: (index: number, hasActivity: boolean | null) => void;
}

/**
 * Invisible — checks ONE account index for any non-zero balance across
 * every configured asset, then reports the result once.
 *
 * REAL BUG FIXED, confirmed directly against the hook's source (not
 * guessed): useBalancesForWallet passes `initialData` into its underlying
 * useQuery call — a SYNCHRONOUS local-store lookup, not a live fetch. That
 * makes `isLoading` false IMMEDIATELY on mount, before any real network
 * check happens. Combined with a 30s staleTime, React Query can treat that
 * placeholder as "fresh enough" and skip fetching entirely for an index
 * that's never actually been queried before — its cached placeholder
 * balance defaults to empty/zero, which this probe was previously reading
 * as a confirmed result. This is exactly why real logs showed every
 * checked index reporting "empty" with NO corresponding real network fetch
 * ever appearing for it — the fetch never happened at all.
 *
 * Fix: explicitly call refetch() on mount to force a real, live check
 * regardless of the cached placeholder, and wait for THAT fetch to
 * complete (isFetching, not isLoading) before reporting anything.
 */
export function AccountDiscoveryProbe({ accountIndex, onResult }: ProbeProps) {
  const { data, isFetching, refetch } = useBalancesForWallet(accountIndex, ASSETS, { enabled: true });
  const reported = useRef(false);
  const hasTriggeredRefetch = useRef(false);
  // Tracks a GENUINE fetch cycle (false -> true -> false), not just a
  // snapshot of isFetching's current value. Calling refetch() doesn't
  // synchronously flip isFetching to true — that update arrives on a LATER
  // render, since it's driven by React Query's own internal state update,
  // not the refetch() call itself. Checking "!isFetching" right after
  // triggering refetch() can see a STALE, pre-kickoff false value and
  // report a result prematurely — the exact bug being fixed here,
  // reintroduced by timing. Requiring that we've actually OBSERVED
  // isFetching become true at least once closes that gap.
  const hasSeenFetchingStart = useRef(false);

  useEffect(() => {
    if (!hasTriggeredRefetch.current) {
      hasTriggeredRefetch.current = true;
      refetch();
    }
  }, [refetch]);

  useEffect(() => {
    if (isFetching) {
      hasSeenFetchingStart.current = true;
      return;
    }

    if (!hasTriggeredRefetch.current || !hasSeenFetchingStart.current || reported.current) return;
    reported.current = true;

    if (!data || data.length === 0) {
      onResult(accountIndex, null);
      return;
    }

    const anyFailed = data.some((b: any) => b.success === false || b.error);
    const anyRealBalance = data.some(
      (b) => b.balance != null && b.balance !== '0' && b.balance !== '',
    );

    if (anyRealBalance) {
      onResult(accountIndex, true);
    } else if (anyFailed) {
      onResult(accountIndex, null);
    } else {
      onResult(accountIndex, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFetching, data]);

  return null;
}
