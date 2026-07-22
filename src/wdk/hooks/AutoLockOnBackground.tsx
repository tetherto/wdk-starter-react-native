import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useWalletActions } from '@/wdk/hooks/useWalletActions';
import { usePasswordSession } from '@/state/passwordSession';
import { useLockSuppression } from '@/state/lockSuppression';

/**
 * Locks the wallet when the app leaves the foreground, so returning requires
 * unlocking. Mount this INSIDE <WdkAppProvider> (it uses a WDK hook).
 *
 * How the lifecycle completes:
 *   background  -> lock() + clear in-memory password -> WDK status READY -> LOCKED
 *   return      -> useWdkSession() sees 'locked' -> WdkSessionGate -> /unlock
 *   unlock()    -> password verified -> WDK back to READY -> gate -> home
 *
 * PLATFORM DIFFERENCE: iOS ALWAYS passes through an intermediate 'inactive'
 * state when backgrounding (active -> inactive -> background), whereas
 * Android transitions directly active -> background. We trigger on REACHING
 * 'background' regardless of what immediately preceded it, which covers
 * both platforms' actual transition paths.
 *
 * SUPPRESSION: some legitimate in-app flows cause a real AppState transition
 * to 'background' without the person actually leaving the app — e.g. Google
 * Sign-In's native Android picker Activity pauses our app's own Activity.
 * Callers that know they're about to trigger this (see cloud-provider.tsx)
 * set useLockSuppression's `suppressed` flag first; we skip locking while
 * it's true. This is NOT the same as the iOS 'inactive' exclusion above —
 * that's about transition sequence, this is an explicit "I know what I'm
 * doing" signal from calling code.
 */
export function AutoLockOnBackground() {
  const { lock, activeWalletId } = useWalletActions();
  const clearPasswordSession = usePasswordSession((s) => s.clear);
  const suppressed = useLockSuppression((s) => s.suppressed);
  const appState = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      const prev = appState.current;
      appState.current = next;

      if (
        activeWalletId &&
        next === 'background' &&
        prev !== 'background' &&
        !suppressed
      ) {
        lock();
        clearPasswordSession();
      }
    });
    return () => sub.remove();
  }, [lock, activeWalletId, clearPasswordSession, suppressed]);

  return null;
}

export default AutoLockOnBackground;
