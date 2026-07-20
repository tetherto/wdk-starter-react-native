import React, { useState } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Screen, ScreenHeader, Button, TextField, Text } from '@/components';
import { useWalletActions } from '@/wdk/hooks/useWalletActions';

/**
 * Password step + wallet commit.
 *
 * create flow: we have the mnemonic from seed-revealed; on continue we persist
 *   the wallet via WDK (importWallet restores+encrypts+unlocks) and proceed.
 * import flow: the wallet was already restored on the import screen; this is
 *   just the password UI step.
 *
 * (The app password field is UX parity with the prototype; WDK handles the
 * real encryption via secure storage + biometrics.)
 */
export default function Password() {
  const router = useRouter();
  const { mode = 'create', mnemonic = '' } = useLocalSearchParams<{ mode?: 'create' | 'import'; mnemonic?: string }>();
  const { importWallet } = useWalletActions();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const step = mode === 'create' ? 'Step 3 of 4' : 'Step 2 of 3';

  const onContinue = async () => {
    setBusy(true); setError(null);
    try {
      if (mode === 'create') {
        // Commit the previewed phrase now (persist + unlock via WDK).
        await importWallet(mnemonic);
      }
      router.push('/(onboarding)/cloud-backup');
    } catch (e: any) {
      setError(e?.message ?? 'Could not create wallet');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen scroll>
      <ScreenHeader title="Create password" step={step} onBack={() => router.back()} />
      <TextField label="Password" placeholder="Enter a password" secureTextEntry />
      <TextField label="Confirm password" placeholder="Re-enter password" secureTextEntry />
      {error ? <Text variant="small" color="error" style={{ marginTop: 8 }}>{error}</Text> : null}
      <Button label="Continue" onPress={onContinue} loading={busy} />
    </Screen>
  );
}
