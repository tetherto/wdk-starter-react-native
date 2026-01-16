import { Stack } from 'expo-router';
import { colors } from '@/constants/colors';

export default function MultisigLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="create" />
      <Stack.Screen name="import" />
      <Stack.Screen name="[address]" />
    </Stack>
  );
}
