import React from 'react';
import { Redirect } from 'expo-router';
import { useSession } from '@/state/session';
import { LoadingState } from '@/components';

/** Entry gate — routes to onboarding / unlock / app based on session status. */
export default function Index() {
  const status = useSession((s) => s.status);
  if (status === 'loading') return <LoadingState message="Starting up" />;
  if (status === 'noWallet') return <Redirect href="/(onboarding)/welcome" />;
  if (status === 'locked') return <Redirect href="/unlock" />;
  return <Redirect href="/(app)/(tabs)/wallet" />;
}
