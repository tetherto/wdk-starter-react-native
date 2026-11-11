import { Stack } from 'expo-router';
import { Toast } from '@/components';

/**
 * Presented as a native fullScreenModal, like send/ and receive/, so it
 * needs its own <Toast /> for the same reason — see send/_layout.tsx.
 */
export default function WalletConnectLayout() {
  return (
    <>
      <Stack screenOptions={{ headerShown: false }} />
      <Toast />
    </>
  );
}
