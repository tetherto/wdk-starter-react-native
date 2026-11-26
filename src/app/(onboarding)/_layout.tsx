import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { usePendingMnemonic } from '@/state/pendingMnemonic';

export default function OnboardingLayout() {
  const clearPendingMnemonic = usePendingMnemonic((s) => s.clear);

  // The generated phrase lives only as long as onboarding does (see
  // state/pendingMnemonic.ts).
  useEffect(() => clearPendingMnemonic, [clearPendingMnemonic]);

  return <Stack screenOptions={{ headerShown: false }} />;
}
