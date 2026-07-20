import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { Screen, ScreenHeader, Button, TextField, Text } from '@/components';
import { useWalletActions } from '@/wdk/hooks/useWalletActions';

export default function Import() {
  const router = useRouter();
  const { importWallet } = useWalletActions();
  const [phrase, setPhrase] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onContinue = async () => {
    setBusy(true); setError(null);
    try {
      await importWallet(phrase);
      router.push('/(onboarding)/password?mode=import');
    } catch (e: any) {
      setError(e?.message ?? 'Could not import wallet');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen scroll>
      <ScreenHeader title="Import wallet" onBack={() => router.back()} />
      <TextField label="Recovery phrase" placeholder="Enter your 12 or 24 words" multiline value={phrase} onChangeText={setPhrase} autoCapitalize="none" />
      {error ? <Text variant="small" color="error" style={{ marginTop: 8 }}>{error}</Text> : null}
      <Button label="Continue" onPress={onContinue} loading={busy} disabled={phrase.trim().length === 0} />
    </Screen>
  );
}
