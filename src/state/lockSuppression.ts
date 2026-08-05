import { create } from 'zustand';

interface LockSuppressionState {
  suppressed: boolean;
  suppress: () => void;
  release: () => void;
}

/**
 * Suppresses AutoLockOnBackground's lock-on-background behavior while a
 * KNOWN, legitimate foreground handoff is in progress.
 *
 * Concrete case this exists for: Google Sign-In's native Android picker
 * launches a SEPARATE Activity, which pauses our app's own Activity — from
 * AppState's perspective this is indistinguishable from the person genuinely
 * backgrounding the app, so AutoLockOnBackground would otherwise lock the
 * wallet mid-sign-in, then WdkSessionGate would redirect to /unlock right in
 * the middle of the cloud-backup flow when the person returns.
 *
 * CloudKit's iCloud sign-in does NOT need this — it's a React Native <Modal>
 * inside the app's own Activity, so it never triggers a real AppState
 * transition in the first place.
 *
 * Usage: call suppress() immediately before starting a flow that's known to
 * launch a separate native Activity, and release() in a finally block once
 * it resolves — success OR failure. Never leave this suppressed indefinitely.
 */
export const useLockSuppression = create<LockSuppressionState>((set) => ({
  suppressed: false,
  suppress: () => set({ suppressed: true }),
  release: () => set({ suppressed: false }),
}));
