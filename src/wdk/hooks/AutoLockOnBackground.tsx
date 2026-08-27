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
        // Genuinely must await now, not a style preference: wm.lock() (via
        // useWalletActions' `lock`) shares an operation mutex with
        // unlock/createWallet/restoreWallet/switchWallet as of
        // wdk-react-native-core PR #77. Firing lock() without awaiting it
        // (the old behavior here) left a real window where a fast
        // background->foreground->unlock sequence could call unlock()
        // while lock() was still mid-flight and holding the mutex — that
        // PR's own notes are explicit lock() "must be awaited before
        // calling another lifecycle method." clearPasswordSession() is
        // deliberately sequenced to run after lock() actually resolves,
        // not just after it's called.
        // .finally() here, not .then().catch(): clearPasswordSession must
        // run whether lock() resolves OR rejects. If lock() throws (e.g.
        // worklet call fails) and we only clear on the success path, the
        // password stays resident in memory while the app sits in the
        // background — exactly the state this component exists to avoid.
        // The rejection is still logged (not left to surface as an
        // unhandled rejection — this fires from an AppState listener,
        // nothing downstream is awaiting this call or positioned to catch
        // a rejection itself), but clearing the password is unconditional.
        lock()
          .catch((e) => {
            console.warn('[AutoLockOnBackground] lock() failed:', e);
          })
          .finally(clearPasswordSession);
      }
    });
    return () => sub.remove();
  }, [lock, activeWalletId, clearPasswordSession, suppressed]);

  return null;
}

export default AutoLockOnBackground;
