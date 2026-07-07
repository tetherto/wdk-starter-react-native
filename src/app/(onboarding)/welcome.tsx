import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Text, Button } from '@/components';

export default function Welcome() {
  const router = useRouter();
  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'center', gap: 8 }}>
        <Text variant="h1" center>WDK Wallet</Text>
        <Text variant="bodyLg" color="textSecondary" center>A self-custodial wallet reference app.</Text>
      </View>
      <Button label="Create a new wallet" onPress={() => router.push('/(onboarding)/seed-hidden')} />
      <Button label="I already have a wallet" variant="secondary" onPress={() => router.push('/(onboarding)/import')} />
    </Screen>
  );
}
