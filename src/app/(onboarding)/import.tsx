import React from 'react';
import { useRouter } from 'expo-router';
import { Screen, ScreenHeader, Button, TextField } from '@/components';

export default function Import() {
  const router = useRouter();
  return (
    <Screen scroll>
      <ScreenHeader title="Import wallet" onBack={() => router.back()} />
      <TextField label="Recovery phrase" placeholder="Enter your 12 or 24 words" multiline />
      <Button label="Continue" onPress={() => router.push('/(onboarding)/password?mode=import')} />
    </Screen>
  );
}
