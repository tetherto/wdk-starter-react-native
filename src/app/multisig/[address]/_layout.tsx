import { Stack } from 'expo-router';
import { colors } from '@/constants/colors';

export default function SafeDetailsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="pending" />
      <Stack.Screen name="send" />
      <Stack.Screen name="owners" />
    </Stack>
  );
}
