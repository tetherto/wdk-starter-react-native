import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, ScreenHeader, Text, Card, LoadingState } from '@/components';
import { useWdkAccount } from '@/wdk/hooks/useWalletData';

export default function Receive() {
  const router = useRouter();
  const account = useWdkAccount();

  return (
    <Screen scroll edges={['top', 'bottom']}>
      <ScreenHeader title="Receive" onBack={() => router.back()} />
      {account.isLoading ? (
        <LoadingState message="Loading address" />
      ) : (
        <Card style={{ alignItems: 'center', paddingVertical: 32 }}>
          <View style={{ width: 180, height: 180, backgroundColor: '#EEE', borderRadius: 12 }} />
          <Text variant="mono" center style={{ marginTop: 16, paddingHorizontal: 16 }}>{account.data?.address || 'No address'}</Text>
          <Text variant="small" color="textSecondary" style={{ marginTop: 4 }}>Your Bitcoin address</Text>
        </Card>
      )}
    </Screen>
  );
}
