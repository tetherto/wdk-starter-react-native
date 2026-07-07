import React from 'react';
import { useRouter } from 'expo-router';
import { Screen, ScreenHeader, Text, Button } from '@/components';
import { useSession } from '@/state/session';

export default function CloudBackup() {
  const router = useRouter();
  const completeOnboarding = useSession((s) => s.completeOnboarding);

  const skip = () => {
    completeOnboarding();
    router.replace('/(app)/(tabs)/wallet');
  };

  return (
    <Screen scroll>
      <ScreenHeader title="Cloud backup" step="Step 4 of 4" onBack={() => router.back()} />
      <Text variant="body" color="textSecondary">
        Back up your encrypted recovery key to the cloud so you can restore your wallet later.
      </Text>
      <Button label="Back up to cloud" onPress={() => router.push('/(onboarding)/cloud-provider')} />
      <Button label="Skip for now" variant="secondary" onPress={skip} />
    </Screen>
  );
}
