import React from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Screen, ScreenHeader, Card, Text, Button } from '@/components';

/** Send step 3: review before sending. */
export default function SendReview() {
  const router = useRouter();
  const { tokenId } = useLocalSearchParams<{ tokenId: string }>();
  return (
    <Screen scroll edges={['top', 'bottom']}>
      <ScreenHeader title="Review" onBack={() => router.back()} />
      <Card>
        <Text variant="small" color="textSecondary">Sending</Text>
        <Text variant="h2" style={{ marginTop: 4 }}>{tokenId}</Text>
        <Text variant="body" color="textSecondary" style={{ marginTop: 12 }}>Recipient, amount, and fee summary render here.</Text>
      </Card>
      <Button label="Confirm & send" onPress={() => router.replace('/send/success?txId=tx_demo')} />
    </Screen>
  );
}
