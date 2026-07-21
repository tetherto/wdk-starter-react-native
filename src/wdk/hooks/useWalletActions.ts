import { useWalletManager } from '@tetherto/wdk-react-native-core';
import { DEFAULT_WALLET_ID } from '../walletIdentity';

/**
 * Wallet lifecycle actions for onboarding / unlock screens. All keyed off
 * DEFAULT_WALLET_ID (see walletIdentity.ts — the single swap point for
 * user-entered IDs later).
 *
 * Flow: seed-hidden calls generateSeed() (generate only) -> seed-revealed shows
 * it -> password calls importWallet(mnemonic) to persist + unlock.
 */
export function useWalletActions() {
  const wm = useWalletManager();

  return {
    /**
     * Generate a fresh mnemonic (does NOT persist a wallet yet).
     * wordCount: 12 (default) or 24 — WDK supports both; the starter
     * defaults to 12 until the person picks 24 on the seed-hidden screen.
     */
    generateSeed: (wordCount: 12 | 24 = 12): Promise<string> => wm.generateMnemonic(wordCount),

    /** Persist a wallet from a mnemonic (restore + encrypt + unlock). */
    importWallet: async (mnemonic: string): Promise<void> => {
      await wm.restoreWallet(mnemonic.trim(), DEFAULT_WALLET_ID);
      wm.setActiveWalletId(DEFAULT_WALLET_ID);
      await wm.unlock(DEFAULT_WALLET_ID);
    },

    /** Unlock the active wallet (WDK prompts biometrics). */
    unlock: async (): Promise<void> => {
      await wm.unlock(DEFAULT_WALLET_ID);
    },

    /** Lock the wallet, clearing sensitive data from memory. */
    lock: (): void => wm.lock(),

    /** Reveal the stored seed phrase (WDK prompts biometrics). */
    getMnemonic: (): Promise<string | null> => wm.getMnemonic(DEFAULT_WALLET_ID),

    activeWalletId: wm.activeWalletId,
    status: wm.status,
  };
}
