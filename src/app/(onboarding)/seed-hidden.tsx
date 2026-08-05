import React, { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Eye } from 'lucide-react-native';
import { Screen, ScreenHeader, Text, Button, Pill, SeedWordGrid } from '@/components';
import { useWalletActions } from '@/wdk/hooks/useWalletActions';
import { useTheme } from '@/theme';
import { useResponsive } from '@/theme/responsive';

/**
 * Recovery phrase — hidden. Matches the prototype's `seed-hidden` screen.
 *
 * Word count: WDK supports 12 or 24-word mnemonics. The prototype only shows
 * 12, but the underlying generateSeed() already accepts either — this screen
 * adds the toggle so the choice is available now rather than bolted on later.
 * Defaults to 12 until the person picks 24.
 */
export default function SeedHidden() {
  const router = useRouter();
  const theme = useTheme();
  const { moderateScale } = useResponsive();
  const { generateSeed } = useWalletActions();
  const [wordCount, setWordCount] = useState<12 | 24>(12);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reveal = async () => {
    setLoading(true);
    setError(null);
    try {
      const mnemonic = await generateSeed(wordCount);
      router.push({ pathname: '/(onboarding)/seed-revealed', params: { mnemonic } });
    } catch (e: any) {
      setError(e?.message ?? 'Failed to generate recovery phrase');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll>
      <ScreenHeader backStyle="plain" step="Step 1 of 4" onBack={() => router.back()} />
      <Text variant="h1">Your recovery phrase</Text>
      <Text variant="body" color="textSecondary">
        Write these {wordCount} words down and keep them somewhere safe. Anyone with this phrase can access your funds.
      </Text>

      <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
        <Pill label="12 words" active={wordCount === 12} onPress={() => setWordCount(12)} />
        <Pill label="24 words" active={wordCount === 24} onPress={() => setWordCount(24)} />
      </View>

      <SeedWordGrid count={wordCount} />

      {error ? (
        <Text variant="small" color="error" style={{ marginBottom: 8 }}>{error}</Text>
      ) : null}

      {/* margin-top: 'auto' pins the button to the bottom of the scroll
          content — matching the prototype's <div style="margin-top:auto">
          wrapper. Screen's ScrollView already sets flexGrow:1 on its content
          container, which is what makes 'auto' push all the way down instead
          of sitting right after the grid. */}
      <View style={{ marginTop: 'auto' }}>
        <Button
          label="Reveal recovery phrase"
          onPress={reveal}
          loading={loading}
          icon={<Eye size={moderateScale(16)} color={theme.colors.white} />}
        />
      </View>
    </Screen>
  );
}
