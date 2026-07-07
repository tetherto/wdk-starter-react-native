import React from 'react';
import { useRouter } from 'expo-router';
import { Screen, ScreenHeader, Text, Button } from '@/components';

/** Pick a cloud provider (iCloud / Google Drive). */
export default function CloudProvider() {
  const router = useRouter();
  return (
    <Screen scroll>
      <ScreenHeader title="Choose provider" onBack={() => router.back()} />
      <Text variant="body" color="textSecondary">Select where to store your encrypted backup.</Text>
      <Button label="iCloud" onPress={() => router.push('/(onboarding)/cloud-backup-success?provider=icloud')} />
      <Button label="Google Drive" variant="secondary" onPress={() => router.push('/(onboarding)/cloud-backup-success?provider=gdrive')} />
    </Screen>
  );
}
