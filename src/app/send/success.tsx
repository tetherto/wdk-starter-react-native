import React from 'react';
import { View } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Screen, Text, Button } from '@/components';

/** Send step 4: success. Returns to the Wallet tab (dismisses the send modal). */
export default function SendSuccess() {
  const router = useRouter();
  const { txId } = useLocalSearchParams<{ txId: string }>();

  const done = () => {
    // The send flow is its own nested stack, so dismissAll() would only return
    // to /send (the pick screen). dismissTo() unwinds the entire send modal
    // straight back to the Wallet tab in ONE call — no navigate-after-dismiss
    // race. The wallet tab is in history (send was opened from it), so this
    // pops every send screen and lands there.
    router.dismissTo('/(app)/(tabs)/wallet');
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={{ flex: 1, justifyContent: 'center', gap: 8 }}>
        <Text variant="h1" center>Sent</Text>
        <Text variant="bodyLg" color="textSecondary" center>Your transaction has been submitted.</Text>
        <Text variant="mono" color="textSecondary" center style={{ marginTop: 8 }}>{txId}</Text>
      </View>
      <Button label="Done" onPress={done} />
    </Screen>
  );
}
