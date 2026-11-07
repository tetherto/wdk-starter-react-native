import { create } from 'zustand';

interface PendingMnemonicState {
  mnemonic: string | null;
  setMnemonic: (mnemonic: string) => void;
  clear: () => void;
}

/**
 * Holds the recovery phrase generated on seed-hidden IN MEMORY ONLY, while
 * the person goes through the create-wallet screens.
 *
 * Why this exists instead of route params: the app handles
 * `wdkstarterreactnative://` links, so anything a screen reads from its
 * params can also come from an inbound link. password.tsx used to read the
 * mnemonic from its params, so a link could open it with someone else's
 * phrase and replace the wallet on the device. Only seed-hidden writes here,
 * so the phrase password.tsx commits is always the one this app generated.
 *
 * The onboarding layout clears it when it unmounts, i.e. when onboarding
 * finishes and the stack is replaced. That is a little longer than the old
 * route params, which went away when their screen was popped: after backing
 * out to welcome the phrase stays until the next reveal overwrites it or
 * onboarding ends. It is kept that long on purpose, so going back from a
 * later step or retrying after an error still commits the same phrase. Like
 * passwordSession, nothing repopulates it after a cold start.
 */
export const usePendingMnemonic = create<PendingMnemonicState>((set) => ({
  mnemonic: null,
  setMnemonic: (mnemonic) => set({ mnemonic }),
  clear: () => set({ mnemonic: null }),
}));
