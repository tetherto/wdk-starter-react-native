import React from 'react';
import { Redirect } from 'expo-router';
import { useWdkSession } from '@/wdk/hooks/useWdkSession';
import { LoadingState, ErrorState } from '@/components';

/**
 * Entry gate — routes based on the WDK's real lifecycle state.
 * WDK is the source of truth: INITIALIZING -> loading, NO_WALLET -> onboarding,
 * LOCKED -> unlock, READY -> app.
 */
export default function Index() {
  const { status, retry } = useWdkSession();

  if (status === 'loading') return <LoadingState message="Starting up" />;
  if (status === 'error') return <ErrorState message="Wallet failed to initialize." onRetry={retry} />;
  if (status === 'noWallet') return <Redirect href="/(onboarding)/welcome" />;
  if (status === 'locked') return <Redirect href="/unlock" />;
  return <Redirect href="/(app)/(tabs)/wallet" />;
}
