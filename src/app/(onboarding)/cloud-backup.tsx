import React from 'react';
import { useRouter } from 'expo-router';
import { Screen, ScreenHeader, Text, Button } from '@/components';

/**
 * Wallet is already created + unlocked by WDK at this point (seed-revealed /
 * import). This step is the optional cloud-backup offer; finishing simply
 * enters the app. The session bridge has already set status to 'unlocked'.
 */
export default function CloudBackup() {
  const router = useRouter();
  const enter = () => router.replace('/(app)/(tabs)/wallet');
  return (
    <Screen scroll>
      <ScreenHeader title="Cloud backup" step="Step 4 of 4" onBack={() => router.back()} />
      <Text variant="body" color="textSecondary">
        Back up your encrypted recovery key to the cloud so you can restore your wallet later.
      </Text>
      <Button label="Back up to cloud" onPress={() => router.push('/(onboarding)/cloud-provider')} />
      <Button label="Skip for now" variant="secondary" onPress={enter} />
    </Screen>
  );
}
