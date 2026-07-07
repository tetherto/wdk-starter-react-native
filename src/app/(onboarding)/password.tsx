import React from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Screen, ScreenHeader, Button, TextField } from '@/components';

/** Password step. `mode` (create|import) drives the step indicator. */
export default function Password() {
  const router = useRouter();
  const { mode = 'create' } = useLocalSearchParams<{ mode?: 'create' | 'import' }>();
  const step = mode === 'create' ? 'Step 3 of 4' : 'Step 2 of 3';
  return (
    <Screen scroll>
      <ScreenHeader title="Create password" step={step} onBack={() => router.back()} />
      <TextField label="Password" placeholder="Enter a password" secureTextEntry />
      <TextField label="Confirm password" placeholder="Re-enter password" secureTextEntry />
      <Button label="Continue" onPress={() => router.push('/(onboarding)/cloud-backup')} />
    </Screen>
  );
}
