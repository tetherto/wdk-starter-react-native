import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useWalletActions } from '@/wdk/hooks/useWalletActions';

/**
 * Locks the wallet when the app leaves the foreground, so returning requires
 * unlocking. Mount this INSIDE <WdkAppProvider> (it uses a WDK hook).
 *
 * How the lifecycle completes:
 *   background  -> lock()  -> WDK status goes READY -> LOCKED
 *   return      -> useWdkSession() sees 'locked' -> index gate -> /unlock
 *   unlock()    -> WDK back to READY -> gate -> home
 *
 * We lock only on 'background' (not 'inactive'): on iOS the app briefly enters
 * 'inactive' during the app-switcher peek or notification shade, and locking on
 * that would force a re-unlock on harmless gestures. 'background' is the real
 * "left the app" signal. If you prefer stricter locking, add 'inactive' to the
 * condition below.
 */
export function AutoLockOnBackground() {
  const { lock, activeWalletId } = useWalletActions();
  const appState = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      const prev = appState.current;
      appState.current = next;

      // Only lock when we actually have an unlocked wallet, and only on a real
      // foreground -> background transition.
      if (activeWalletId && prev === 'active' && next === 'background') {
        lock();
      }
    });
    return () => sub.remove();
  }, [lock, activeWalletId]);

  return null;
}

export default AutoLockOnBackground;
