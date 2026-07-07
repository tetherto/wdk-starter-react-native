import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Text, Button, TextField } from '@/components';
import { useSession } from '@/state/session';

export default function Unlock() {
  const router = useRouter();
  const unlock = useSession((s) => s.unlock);

  const doUnlock = () => {
    unlock();
    router.replace('/(app)/(tabs)/wallet');
  };

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Text variant="h1" center>Welcome back</Text>
        <TextField label="Password" placeholder="Enter your password" secureTextEntry />
      </View>
      <Button label="Unlock" onPress={doUnlock} />
    </Screen>
  );
}
