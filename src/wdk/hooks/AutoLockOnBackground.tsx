import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useWalletActions } from '@/wdk/hooks/useWalletActions';
import { usePasswordSession } from '@/state/passwordSession';

/**
 * Locks the wallet when the app leaves the foreground, so returning requires
 * unlocking. Mount this INSIDE <WdkAppProvider> (it uses a WDK hook).
 *
 * IMPORTANT PLATFORM DIFFERENCE, confirmed via device logs: iOS ALWAYS passes
 * through an intermediate 'inactive' state when backgrounding —
 * active -> inactive -> background — whereas Android transitions directly
 * active -> background. 
 *
 * Trigger on REACHING 'background', regardless of what state
 * immediately preceded it — as long as we weren't already in 'background'
 * (avoids acting on a redundant background->background, which shouldn't
 * happen but costs nothing to guard). This covers both platforms' actual
 * transition paths without needing to special-case either one.
 *
 * We do NOT lock on 'inactive' alone — iOS enters that state briefly for
 * things like the control center or a share sheet, and locking on that would
 * be too aggressive. Only a real transition into 'background' locks.
 */
export function AutoLockOnBackground() {
  const { lock, activeWalletId } = useWalletActions();
  const clearPasswordSession = usePasswordSession((s) => s.clear);
  const appState = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      const prev = appState.current;
      appState.current = next;

      if (activeWalletId && next === 'background' && prev !== 'background') {
        lock();
        clearPasswordSession();
      }
    });
    return () => sub.remove();
  }, [lock, activeWalletId, clearPasswordSession]);

  return null;
}

export default AutoLockOnBackground;
