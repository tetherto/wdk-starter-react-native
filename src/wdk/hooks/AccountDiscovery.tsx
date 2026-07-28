import { useEffect, useRef, useState, useCallback } from 'react';
import { useWdkSession } from './useWdkSession';
import { useAccounts } from '@/state/accounts';
import { AccountDiscoveryProbe } from './AccountDiscoveryProbe';

/**
 * Checks a bounded set of account indices for real on-chain activity once
 * per unlock. See accounts.ts's header comment for why this exists at all
 * (no local persistence of which accounts exist, by design).
 *
 * REAL BUG FIXED: this used to watch useWalletManager().status === 'UNLOCKED'
 * directly. That's a DIFFERENT, narrower status than what's actually needed
 * here — useWalletManager().status only reflects the wallet's own lock
 * state, and can report 'UNLOCKED' before the broader WDK app/worklet
 * infrastructure (providers, etc.) has actually finished initializing.
 * useWdkSession() (the same hook WdkSessionGate already relies on) reads
 * from useWdkApp().state.status instead — a SEPARATE, more complete signal
 * that only reaches 'READY' (mapped here to 'unlocked') once the whole
 * system is genuinely ready, not just the wallet lock itself.
 *
 * This is exactly what explained the reported symptoms: right after import,
 * the wallet reports unlocked quickly while WDK's broader infrastructure was
 * possibly still settling, so balance queries fired at that exact moment
 * could genuinely fail — not a timing race to paper over with more retries,
 * but the wrong readiness signal entirely. After a full app restart, WDK's
 * infrastructure already had time to initialize before the unlock screen
 * even appeared, so discovery worked reliably by coincidence of timing, not
 * because the logic was actually correct.
 */
const CHECK_UP_TO_INDEX = 5; // checks indices 1..5, in addition to 0
const MAX_RETRIES_PER_INDEX = 2;

export function AccountDiscovery() {
  const { status } = useWdkSession();
  const mergeDiscovered = useAccounts((s) => s.mergeDiscovered);
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const foundRef = useRef<number[]>([]);
  const hasRunForThisUnlock = useRef(false);

  useEffect(() => {
    if (status === 'unlocked' && !hasRunForThisUnlock.current) {
      console.log('[AccountDiscovery] session ready — starting discovery from index 1');
      hasRunForThisUnlock.current = true;
      foundRef.current = [];
      setRetryCount(0);
      setCurrentIndex(1);
    }
    if (status !== 'unlocked') {
      hasRunForThisUnlock.current = false;
      setCurrentIndex(null);
    }
  }, [status]);

  const onResult = useCallback(
    (index: number, hasActivity: boolean | null) => {
      if (hasActivity === null) {
        setRetryCount((prev) => {
          if (prev < MAX_RETRIES_PER_INDEX) {
            return prev + 1;
          }
          console.warn(`[AccountDiscovery] Could not confirm account ${index} after ${MAX_RETRIES_PER_INDEX} retries — skipping, but this is NOT the same as confirming it's empty.`);
          return prev;
        });
        if (retryCount < MAX_RETRIES_PER_INDEX) return;
      } else if (hasActivity === true) {
        foundRef.current.push(index);
      }

      console.log(`[AccountDiscovery] index ${index} -> ${hasActivity === null ? 'unknown/failed' : hasActivity ? 'ACTIVE' : 'empty'}`);

      setRetryCount(0);
      if (index < CHECK_UP_TO_INDEX) {
        setCurrentIndex(index + 1);
      } else {
        console.log('[AccountDiscovery] done — discovered indices with activity:', foundRef.current);
        mergeDiscovered(foundRef.current);
        setCurrentIndex(null);
      }
    },
    [mergeDiscovered, retryCount],
  );

  if (currentIndex == null) return null;

  return (
    <AccountDiscoveryProbe
      key={`${currentIndex}-${retryCount}`}
      accountIndex={currentIndex}
      onResult={onResult}
    />
  );
}
