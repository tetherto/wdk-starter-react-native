import React from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Screen, ScreenHeader, TextField, Button } from '@/components';

/** Send step 2: enter recipient + amount. */
export default function SendAmount() {
  const router = useRouter();
  const { tokenId } = useLocalSearchParams<{ tokenId: string }>();
  return (
    <Screen scroll edges={['top', 'bottom']}>
      <ScreenHeader title="Send" onBack={() => router.back()} />
      <TextField label="Recipient address" placeholder="Paste or scan an address" />
      <TextField label={`Amount (${tokenId ?? ''})`} placeholder="0.00" keyboardType="decimal-pad" />
      <Button label="Review" onPress={() => router.push(`/send/review?tokenId=${tokenId}`)} />
    </Screen>
  );
}
