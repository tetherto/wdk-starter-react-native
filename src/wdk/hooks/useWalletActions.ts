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

    /**
     * Persist a wallet from a mnemonic (restore + encrypt + unlock).
     *
     * SELF-HEALS a specific iOS-only condition: iOS Keychain deliberately
     * SURVIVES app deletion (documented Apple behavior). So after a delete +
     * reinstall, WDK can still find a 'primary' wallet registered from the
     * PREVIOUS install and refuse to recreate it ("A wallet with the ID
     * 'primary' already exists"), even though this is a brand new install
     * with no wallet from the person's point of view. Android wipes this
     * kind of app storage on uninstall, so it doesn't hit this.
     *
     * If restoreWallet fails with that specific error, silently delete the
     * stale registration and retry ONCE. We don't retry on any other error —
     * only this known, identifiable condition — so a genuine unrelated
     * failure (bad mnemonic, worklet not ready, etc.) still surfaces
     * normally instead of being silently swallowed and retried forever.
     */
    importWallet: async (mnemonic: string): Promise<void> => {
      const trimmed = mnemonic.trim();
      try {
        await wm.restoreWallet(trimmed, DEFAULT_WALLET_ID);
      } catch (e: any) {
        const alreadyExists = /already exists/i.test(e?.message ?? '');
        if (!alreadyExists) throw e;

        await wm.deleteWallet(DEFAULT_WALLET_ID);
        await wm.restoreWallet(trimmed, DEFAULT_WALLET_ID);
      }
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