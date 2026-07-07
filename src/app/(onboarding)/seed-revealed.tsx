import React from 'react';
import { useRouter } from 'expo-router';
import { Screen, ScreenHeader, Text, Button } from '@/components';

/** Seed step 2: phrase shown, user confirms they've saved it. */
export default function SeedRevealed() {
  const router = useRouter();
  return (
    <Screen scroll>
      <ScreenHeader title="Recovery phrase" step="Step 2 of 4" onBack={() => router.back()} />
      <Text variant="body" color="textSecondary">
        The 12 words render here (WDK generates them later). Write them down in order.
      </Text>
      <Button label="I've saved it" onPress={() => router.push('/(onboarding)/password?mode=create')} />
    </Screen>
  );
}
