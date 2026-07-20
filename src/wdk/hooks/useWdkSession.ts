import { useWdkApp, useWalletManager } from '@tetherto/wdk-react-native-core';
import { DEFAULT_WALLET_ID } from '../walletIdentity';

export type AppSessionStatus = 'loading' | 'noWallet' | 'locked' | 'unlocked' | 'error';

/**
 * Maps WDK's raw lifecycle state to the app-level status the entry gate and
 * WdkSessionGate route on.
 *
 * IMPORTANT — a quirk of this WDK version's lock() worth knowing:
 * Calling wm.lock() (no id) does NOT produce a LOCKED status. It clears the
 * *active* wallet id and WDK reports NO_WALLET — the same raw status as
 * "no wallet was ever created". Trusting raw status alone would send an
 * existing user back through onboarding after every background/lock, even
 * though their wallet is still safely on disk.
 *
 * Fix: disambiguate using the persisted wallets list. If DEFAULT_WALLET_ID is
 * still present in wallets (it survives lock(), since that list reflects what's
 * in secure storage, not the in-memory active pointer), a NO_WALLET status
 * means "exists but currently locked" -> map to 'locked'. Only treat it as a
 * genuine 'noWallet' when the wallet truly isn't in storage.
 *
 *   INITIALIZING / REINITIALIZING        -> 'loading'
 *   NO_WALLET, wallet IS in storage      -> 'locked'   (was lock()'d)
 *   NO_WALLET, wallet NOT in storage     -> 'noWallet' (never created)
 *   LOCKED                                -> 'locked'
 *   READY                                 -> 'unlocked'
 *   ERROR                                 -> 'error'
 */
export function useWdkSession(): { status: AppSessionStatus; retry: () => void } {
  const { state, retry } = useWdkApp();
  const { wallets } = useWalletManager();

  const hasStoredWallet =
    Array.isArray(wallets) && wallets.some((w) => w.identifier === DEFAULT_WALLET_ID);

  let status: AppSessionStatus;
  switch (state.status) {
    case 'INITIALIZING':
    case 'REINITIALIZING':
      status = 'loading';
      break;
    case 'NO_WALLET':
      status = hasStoredWallet ? 'locked' : 'noWallet';
      break;
    case 'LOCKED':
      status = 'locked';
      break;
    case 'READY':
      status = 'unlocked';
      break;
    case 'ERROR':
      status = 'error';
      break;
    default:
      status = 'loading';
  }

  return { status, retry };
}