import React, { useState } from 'react';
import { Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { Copy, Check } from 'lucide-react-native';
import { Screen, ScreenHeader, Text, Button, SeedWordGrid } from '@/components';
import { useTheme } from '@/theme';
import { useResponsive } from '@/theme/responsive';

/**
 * Recovery phrase — revealed. Matches the prototype's `seed-revealed` screen.
 *
 * Receives the mnemonic generated on seed-hidden via route params. Works for
 * BOTH 12 and 24 words unchanged — SeedWordGrid renders whatever length array
 * it's given, so there's no separate branch for word count here; the choice
 * was already made on the previous screen.
 *
 * NOTE: unlike seed-hidden, the prototype does NOT bottom-pin this screen's
 * button — it flows naturally right after the copy-to-clipboard link. Don't
 * copy the marginTop:'auto' pattern from the previous screen here.
 */
export default function SeedRevealed() {
  const router = useRouter();
  const theme = useTheme();
  const { moderateScale } = useResponsive();
  const { mnemonic = '' } = useLocalSearchParams<{ mnemonic?: string }>();
  const [copied, setCopied] = useState(false);

  const words = mnemonic.trim().split(/\s+/).filter(Boolean);

  const onCopy = async () => {
    await Clipboard.setStringAsync(mnemonic);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const onContinue = () => {
    router.push({ pathname: '/(onboarding)/password', params: { mode: 'create', mnemonic } });
  };

  return (
    <Screen scroll>
      <ScreenHeader backStyle="plain" step="Step 2 of 4" onBack={() => router.back()} />
      <Text variant="h1">Write this down</Text>
      <Text variant="body" color="textSecondary">
        These {words.length} words are the only way to recover your wallet. Save them now.
      </Text>

      <SeedWordGrid words={words} />

      <Pressable
        accessibilityRole="button"
        onPress={onCopy}
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginVertical: moderateScale(12) }}
      >
        {copied ? (
          <Check size={moderateScale(16)} color={theme.colors.brand} />
        ) : (
          <Copy size={moderateScale(16)} color={theme.colors.brand} />
        )}
        <Text variant="button" color="brand">
          {copied ? 'Copied' : 'Copy to clipboard'}
        </Text>
      </Pressable>

      <Button label="I have saved my phrase" onPress={onContinue} />
    </Screen>
  );
}
