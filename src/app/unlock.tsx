import React, { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Text, Button, TextField } from '@/components';
import { useWalletActions } from '@/wdk/hooks/useWalletActions';

export default function Unlock() {
  const router = useRouter();
  const { unlock } = useWalletActions();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const doUnlock = async () => {
    setBusy(true); setError(null);
    try {
      await unlock(); // triggers WDK biometric/secure-storage decrypt
      router.replace('/(app)/(tabs)/wallet');
    } catch (e: any) {
      setError(e?.message ?? 'Unlock failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Text variant="h1" center>Welcome back</Text>
        <Text variant="body" color="textSecondary" center style={{ marginTop: 8 }}>
          Unlock your wallet to continue.
        </Text>
        {error ? <Text variant="small" color="error" center style={{ marginTop: 8 }}>{error}</Text> : null}
      </View>
      <Button label="Unlock" onPress={doUnlock} loading={busy} />
    </Screen>
  );
}
