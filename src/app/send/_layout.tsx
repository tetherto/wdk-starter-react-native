import { Stack } from 'expo-router';
import { Toast } from '@/components';

/**
 * Toast is mounted here TOO, not just at the app root — real fix, not
 * redundancy. `send` is presented as a native fullScreenModal (see the root
 * _layout.tsx's Stack.Screen options), which uses react-native-screens' own
 * native modal presentation. The root-level <Toast/> uses React Native's
 * OWN, separate <Modal> component to guarantee it renders above whatever
 * screen is active — but that's a DIFFERENT native presentation mechanism
 * from react-native-screens' modal, and the two don't reliably stack with
 * each other. The toast's state was updating correctly the whole time; it
 * was just presenting in a different native layer than this screen, behind
 * it rather than above.
 *
 * Mounting Toast HERE, inside send's own nested Stack, puts it in the SAME
 * native presentation as send/index.tsx, send/amount.tsx, etc. — no
 * cross-layer stacking involved. useToast is a shared, singleton store, so
 * this instance and the root instance stay perfectly in sync; only whichever
 * one is in the currently-active native layer is ever visually reachable,
 * which is exactly the correct behavior.
 */
export default function SendLayout() {
  return (
    <>
      <Stack screenOptions={{ headerShown: false }} />
      <Toast />
    </>
  );
}
