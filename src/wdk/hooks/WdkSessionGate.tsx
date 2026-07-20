import { useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { useWdkSession } from '@/wdk/hooks/useWdkSession';

/**
 * Watches WDK's session status from the ROOT of the app and force-navigates
 * to /unlock the moment it becomes 'locked' — no matter which screen the user
 * is currently on.
 *
 * Why this is needed: app/index.tsx only decides where to go when the app
 * navigates TO "/". Once the user is inside the app (e.g. on the wallet home
 * screen) and backgrounds/returns, expo-router does NOT re-run index.tsx just
 * because WDK's internal status changed — the user stays on whatever screen
 * they were on. This component is the thing that's actually watching for a
 * lock while the user is deep in the app, and it's what index.tsx alone can't
 * do. Mount it once, at the root, alongside AutoLockOnBackground.
 */
export function WdkSessionGate() {
  const router = useRouter();
  const { status } = useWdkSession();
  const prevStatus = useRef(status);

  useEffect(() => {
    if (status === 'locked' && prevStatus.current !== 'locked') {
      router.replace('/unlock');
    }
    prevStatus.current = status;
  }, [status, router]);

  useEffect(() => console.log('[WDK] status:', status), [status]);

  return null;
}

export default WdkSessionGate;
