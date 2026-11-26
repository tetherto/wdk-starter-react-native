import React, { useState } from 'react';
import { View } from 'react-native';
import { Redirect, useRouter, useLocalSearchParams } from 'expo-router';
import { Screen, ScreenHeader, Text, TextField, Button } from '@/components';
import { useWalletActions } from '@/wdk/hooks/useWalletActions';
import { setAppPassword } from '@/wdk/passwordVault';
import { usePasswordSession } from '@/state/passwordSession';
import { usePendingMnemonic } from '@/state/pendingMnemonic';

const MIN_PASSWORD_LENGTH = 8;

/**
 * Password step + wallet commit + app password vault setup.
 *
 * In BOTH create and import modes, this screen now establishes the app-level
 * password gate: it encrypts a fixed verifier with the chosen password (via
 * wdk-utils, see passwordVault.ts) and stores it in secure storage. From then
 * on, unlock.tsx requires this password before it will call WDK's unlock() —
 * biometrics/WDK's own secure storage alone are no longer sufficient.
 *
 * The password is also kept in memory for this session (passwordSession) so
 * the very next screen (cloud-backup) can encrypt the backup payload with it
 * without asking a second time. It is never written to disk in plaintext.
 *
 * In create mode the phrase comes from the in-memory pendingMnemonic store
 * that seed-hidden fills, never from route params, so an inbound link can't
 * hand this screen a phrase to commit (see state/pendingMnemonic.ts). Opened
 * in create mode without one, e.g. from a link, it redirects to the index
 * route instead.
 */
export default function Password() {
  const router = useRouter();
  const { mode = 'create' } = useLocalSearchParams<{ mode?: 'create' | 'import' }>();
  const { importWallet } = useWalletActions();
  const setSessionPassword = usePasswordSession((s) => s.setPassword);
  const pendingMnemonic = usePendingMnemonic((s) => s.mnemonic);
  const phraseToCommit = mode === 'create' ? pendingMnemonic : null;
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const step = mode === 'create' ? 'Step 3 of 4' : 'Step 2 of 3';

  if (mode === 'create' && !phraseToCommit) return <Redirect href="/" />;

  const onContinue = async () => {
    setError(null);
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setBusy(true);
    try {
      if (phraseToCommit) {
        // Create mode: commit the previewed phrase now (persist + unlock via WDK).
        await importWallet(phraseToCommit);
      }
      // Establish the app password gate (both create and import flows).
      await setAppPassword(password);
      setSessionPassword(password);
      router.push('/(onboarding)/cloud-backup');
    } catch (e: any) {
      setError(e?.message ?? 'Could not create wallet');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen scroll>
      <ScreenHeader backStyle="plain" step={step} onBack={() => router.back()} />
      <Text variant="h1">Create a password</Text>
      <Text variant="body" color="textSecondary">
        This password secures your wallet on this device. You'll need it to unlock the app going forward.
      </Text>

      <TextField
        label="Password"
        placeholder="Enter password"
        secureTextEntry
        textContentType="newPassword"
        value={password}
        onChangeText={setPassword}
      />
      <TextField
        label="Confirm password"
        placeholder="Re-enter password"
        secureTextEntry
        value={confirm}
        onChangeText={setConfirm}
      />

      {error ? <Text variant="small" color="error" style={{ marginTop: 8 }}>{error}</Text> : null}

      <View style={{ marginTop: 'auto' }}>
        <Button
          label="Continue"
          onPress={onContinue}
          loading={busy}
          // Real bug fixed: was `!password || !confirm`, which fully
          // disabled the button (never even calling onContinue) until
          // BOTH fields had any text at all — meaning a too-short
          // password with an empty Confirm field showed no error
          // whatsoever, since the length check never got a chance to run.
          disabled={!password}
        />
      </View>
    </Screen>
  );
}
