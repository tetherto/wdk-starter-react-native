import { create } from 'zustand';

/**
 * App session status — a thin flag that drives routing.
 * WDK will hydrate `status` on launch (by checking secure storage) later.
 */
export type SessionStatus = 'loading' | 'noWallet' | 'locked' | 'unlocked';

interface SessionState {
  status: SessionStatus;
  /** True once a wallet has been created/imported — gates auto-lock. */
  hasWallet: boolean;
  setStatus: (s: SessionStatus) => void;
  /** Called when onboarding completes: a wallet now exists and is open. */
  completeOnboarding: () => void;
  /** Lock the wallet (e.g. on backgrounding). No-op if no wallet exists. */
  lock: () => void;
  unlock: () => void;
}

export const useSession = create<SessionState>((set, get) => ({
  status: 'loading', // WDK session bridge sets the real status on init
  hasWallet: false,
  setStatus: (status) => set({ status }),
  completeOnboarding: () => set({ hasWallet: true, status: 'unlocked' }),
  lock: () => { if (get().hasWallet) set({ status: 'locked' }); },
  unlock: () => set({ status: 'unlocked' }),
}));
