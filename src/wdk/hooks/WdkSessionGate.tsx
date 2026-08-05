import { useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { useWdkSession } from '@/wdk/hooks/useWdkSession';

/**
 * Watches WDK's session status from the ROOT of the app and force-navigates
 * to /unlock on a GENUINE unlocked -> locked transition — no matter which
 * screen the user is currently on.
 *
 * Why this is needed: app/index.tsx only decides where to go when the app
 * navigates TO "/". Once the user is inside the app (e.g. on the wallet home
 * screen) and backgrounds/returns, expo-router does NOT re-run index.tsx just
 * because WDK's internal status changed — the user stays on whatever screen
 * they were on. This component is the thing that's actually watching for a
 * lock while the user is deep in the app, and it's what index.tsx alone can't
 * do. Mount it once, at the root, alongside AutoLockOnBackground.
 *
 * We only redirect on the SPECIFIC transition unlocked -> locked, not just
 * any arrival at 'locked'. Wallet CREATION itself briefly passes through a
 * locked-looking state as a normal part of restoreWallet -> unlock (the
 * wallet is registered in storage a moment before it's actually unlocked in
 * memory) — its previous status is 'noWallet'/'loading', never 'unlocked', so
 * requiring that specific transition naturally excludes it without needing
 * to know anything about WHY the status changed.
 */
export function WdkSessionGate() {
  const router = useRouter();
  const { status } = useWdkSession();
  const prevStatus = useRef(status);

  useEffect(() => {
    if (status === 'locked' && prevStatus.current === 'unlocked') {
      router.replace('/unlock');
    }
    prevStatus.current = status;
  }, [status, router]);

  return null;
}

export default WdkSessionGate;
