import React from 'react';
import { View } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Screen, Text, Button } from '@/components';
import { useSession } from '@/state/session';

export default function CloudBackupSuccess() {
  const router = useRouter();
  const { provider } = useLocalSearchParams<{ provider?: string }>();
  const completeOnboarding = useSession((s) => s.completeOnboarding);
  const label = provider === 'gdrive' ? 'Google Drive' : 'iCloud';

  const enter = () => {
    completeOnboarding();
    router.replace('/(app)/(tabs)/wallet');
  };

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'center', gap: 8 }}>
        <Text variant="h1" center>Backup complete</Text>
        <Text variant="bodyLg" color="textSecondary" center>Your wallet is backed up to {label}.</Text>
      </View>
      <Button label="Enter wallet" onPress={enter} />
    </Screen>
  );
}
