import { Stack } from 'expo-router';
import { Toast } from '@/components';

/**
 * Same fix as send/_layout.tsx — receive is ALSO a native fullScreenModal,
 * so it has the identical latent risk of the root-level Toast (which uses
 * its own separate <Modal>) rendering in the wrong native layer. See
 * send/_layout.tsx's comment for the full explanation.
 */
export default function ReceiveLayout() {
  return (
    <>
      <Stack screenOptions={{ headerShown: false }} />
      <Toast />
    </>
  );
}
