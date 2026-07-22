import React, { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, ScreenHeader, Text, Button, Pill, SeedWordInputGrid } from '@/components';
import { useWalletActions } from '@/wdk/hooks/useWalletActions';

/**
 * Import recovery phrase. Matches the prototype's `seed-import` screen: a
 * 2-column grid of numbered word boxes (not one paste-all field), a
 * bottom-pinned "Import wallet" button.
 *
 * Word count: the prototype only shows a fixed 12-box grid, but WDK supports
 * 12 or 24-word mnemonics — same 12/24 toggle pattern as seed-hidden, so a
 * 24-word phrase can actually be imported, not just previewed.
 *
 * Flow: import wallet HERE (restore + unlock via WDK) -> push to password
 * (mode=import, which sets up the app password vault but does NOT call
 * importWallet again, since it's already done) -> cloud-backup. This mirrors
 * exactly how password.tsx already expects the import flow to work.
 */
export default function Import() {
  const router = useRouter();
  const { importWallet } = useWalletActions();
  const [wordCount, setWordCount] = useState<12 | 24>(12);
  const [words, setWords] = useState<string[]>(Array(24).fill(''));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filled = words.slice(0, wordCount).filter((w) => w.trim().length > 0);
  const canImport = filled.length === wordCount;

  const onImport = async () => {
    setError(null);
    setBusy(true);
    try {
      const mnemonic = words.slice(0, wordCount).map((w) => w.trim()).join(' ');
      await importWallet(mnemonic);
      router.push('/(onboarding)/password?mode=import');
    } catch (e: any) {
      setError(e?.message ?? 'Could not import wallet. Check your recovery phrase and try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen scroll>
      <ScreenHeader backStyle="plain" step="Step 1 of 3" onBack={() => router.back()} />
      <Text variant="h1">Enter recovery phrase</Text>
      <Text variant="body" color="textSecondary">
        Enter your {wordCount}-word recovery phrase to import your wallet. Words are separated by spaces.
      </Text>

      <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
        <Pill label="12 words" active={wordCount === 12} onPress={() => setWordCount(12)} />
        <Pill label="24 words" active={wordCount === 24} onPress={() => setWordCount(24)} />
      </View>

      <SeedWordInputGrid count={wordCount} words={words} onChangeWords={setWords} />

      {error ? (
        <Text variant="small" color="error" style={{ marginBottom: 8 }}>{error}</Text>
      ) : null}

      <View style={{ marginTop: 'auto' }}>
        <Button
          label="Import wallet"
          onPress={onImport}
          loading={busy}
          disabled={!canImport}
        />
      </View>
    </Screen>
  );
}
