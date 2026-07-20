import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { Screen, ScreenHeader, Text, Button } from '@/components';
import { useWalletActions } from '@/wdk/hooks/useWalletActions';

export default function SeedHidden() {
  const router = useRouter();
  const { generateSeed } = useWalletActions();
  const [loading, setLoading] = useState(false);

  const reveal = async () => {
    setLoading(true);
    try {
      const mnemonic = await generateSeed();
      // Pass the generated phrase to the reveal screen (params are strings).
      router.push({ pathname: '/(onboarding)/seed-revealed', params: { mnemonic } });
    } catch (e: any) {
      setLoading(false);
    }
  };

  return (
    <Screen scroll>
      <ScreenHeader title="Recovery phrase" step="Step 1 of 4" onBack={() => router.back()} />
      <Text variant="body" color="textSecondary">
        Your recovery phrase is the key to your wallet. It will be shown once — write it down and keep it safe.
      </Text>
      <Button label="Reveal phrase" onPress={reveal} loading={loading} />
    </Screen>
  );
}
