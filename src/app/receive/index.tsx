import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, ScreenHeader, Text, Card } from '@/components';

export default function Receive() {
  const router = useRouter();
  return (
    <Screen scroll edges={['top', 'bottom']}>
      <ScreenHeader title="Receive" onBack={() => router.back()} />
      <Card style={{ alignItems: 'center', paddingVertical: 32 }}>
        <View style={{ width: 180, height: 180, backgroundColor: '#EEE', borderRadius: 12 }} />
        <Text variant="mono" style={{ marginTop: 16 }}>0x330f...9aFE1</Text>
        <Text variant="small" color="textSecondary" style={{ marginTop: 4 }}>QR code renders here</Text>
      </Card>
    </Screen>
  );
}
