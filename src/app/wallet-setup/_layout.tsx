import { Stack } from 'expo-router';

export default function WalletSetupLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: '#121212' },
      }}
    >
      <Stack.Screen name="name-wallet" />
      <Stack.Screen name="secure-wallet" />
      <Stack.Screen name="confirm-phrase" />
      <Stack.Screen name="import-wallet" />
      <Stack.Screen name="import-name-wallet" />
      <Stack.Screen name="complete" options={{ animation: 'fade' }} />
    </Stack>
  );
}
