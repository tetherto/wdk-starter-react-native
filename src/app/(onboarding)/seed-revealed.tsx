import React from 'react';
import { View } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Screen, ScreenHeader, Text, Button, Card } from '@/components';

/**
 * Seed step 2: display the phrase generated in seed-hidden (passed via params).
 * We do NOT persist the wallet yet — creation is committed after the user sets
 * a password (create-wallet flow), so an abandoned onboarding leaves nothing
 * stored. The mnemonic is carried forward as a param.
 */
export default function SeedRevealed() {
  const router = useRouter();
  const { mnemonic = '' } = useLocalSearchParams<{ mnemonic?: string }>();
  const words = mnemonic.split(' ').filter(Boolean);

  return (
    <Screen scroll>
      <ScreenHeader title="Recovery phrase" step="Step 2 of 4" onBack={() => router.back()} />
      <Text variant="body" color="textSecondary" style={{ marginBottom: 12 }}>
        Write these words down in order and keep them somewhere safe.
      </Text>
      <Card>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 10 }}>
          {words.map((w, i) => (
            <Text key={i} variant="body" style={{ width: '33%' }}>{i + 1}. {w}</Text>
          ))}
        </View>
      </Card>
      <Button
        label="I've saved it"
        onPress={() => router.push({ pathname: '/(onboarding)/password', params: { mode: 'create', mnemonic } })}
      />
    </Screen>
  );
}
