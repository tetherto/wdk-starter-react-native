import React from 'react';
import { useRouter } from 'expo-router';
import { Screen, ScreenHeader, Text, Button } from '@/components';

/** Seed step 1: phrase hidden behind a reveal action. */
export default function SeedHidden() {
  const router = useRouter();
  return (
    <Screen scroll>
      <ScreenHeader title="Recovery phrase" step="Step 1 of 4" onBack={() => router.back()} />
      <Text variant="body" color="textSecondary">
        Your recovery phrase is the key to your wallet. It will be hidden until you tap reveal.
      </Text>
      <Button label="Reveal phrase" onPress={() => router.push('/(onboarding)/seed-revealed')} />
    </Screen>
  );
}
