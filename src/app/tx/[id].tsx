import React from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Screen, ScreenHeader, Card, Text } from '@/components';

export default function TxDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <Screen scroll>
      <ScreenHeader title="Transaction" onBack={() => router.back()} />
      <Card>
        <Text variant="small" color="textSecondary">Transaction ID</Text>
        <Text variant="mono" style={{ marginTop: 4 }}>{id}</Text>
      </Card>
    </Screen>
  );
}
