import React from 'react';
import { Redirect } from 'expo-router';
import { useWdkSession } from '@/wdk/hooks/useWdkSession';
import { LoadingState, ErrorState } from '@/components';

/**
 * Entry gate — routes based on the WDK's real lifecycle state.
 * WDK is the source of truth: INITIALIZING -> loading, NO_WALLET -> onboarding,
 * LOCKED -> unlock, READY -> app.
 *
 * No "Try again" button on the error state below, as of
 * wdk-react-native-core PR #77 (tetherto/wdk-react-native-core#77):
 * useWdkApp() no longer exposes a `retry()` function at all. That PR's own
 * guidance for the removal is to re-call whichever specific lifecycle
 * method failed (unlock/createWallet/restoreWallet) — but there genuinely
 * isn't one of those to re-call here. This screen renders when the
 * underlying worklet/app-level initialization itself failed, before any
 * such method was ever called, so there's no specific action this screen
 * can retry. `onRetry` is optional on ErrorState (see StateViews.tsx), so
 * omitting it here is a real, deliberate choice — not a missed prop — and
 * correctly makes the button disappear entirely rather than wire it to a
 * fabricated action that doesn't reflect what's actually possible with the
 * new API. If this needs a real retry path later, it would mean giving
 * WdkAppProvider a remount key at the layout level, which is a genuinely
 * bigger, separate change than this file alone.
 */
export default function Index() {
  const { status } = useWdkSession();

  if (status === 'loading') return <LoadingState message="Starting up" />;
  if (status === 'error') return <ErrorState message="Wallet failed to initialize. Please close and reopen the app." />;
  if (status === 'noWallet') return <Redirect href="/(onboarding)/welcome" />;
  if (status === 'locked') return <Redirect href="/unlock" />;
  return <Redirect href="/(app)/(tabs)/wallet" />;
}
