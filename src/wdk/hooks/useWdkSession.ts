import { useWdkApp, useWalletManager } from '@tetherto/wdk-react-native-core';
import { DEFAULT_WALLET_ID } from '../walletIdentity';

export type AppSessionStatus = 'loading' | 'noWallet' | 'locked' | 'unlocked' | 'error';

/**
 * Maps WDK's raw lifecycle state to the app-level status the entry gate and
 * WdkSessionGate route on.
 *
 * UPDATE (wdk-react-native-core PR #77 / tetherto/wdk-react-native-core#77):
 * the quirk this hasStoredWallet check was originally written for — calling
 * wm.lock() (no id) reporting NO_WALLET instead of LOCKED even when a wallet
 * genuinely exists on disk — is fixed upstream by that PR ("NO_WALLET no
 * longer misreports right after lock() when a wallet is actually known to
 * exist"). Post-upgrade, WDK's own raw status should already distinguish
 * these correctly on its own.
 *
 * Kept the disambiguation logic below anyway, rather than deleting it,
 * since removing a working safety net on the strength of a changelog
 * description — without having independently exercised the new behavior
 * end to end ourselves yet — is a worse trade than a little redundancy.
 * Once this has been verified against a real device (lock -> background ->
 * foreground -> confirm 'locked', not 'noWallet', on the new version), this
 * whole block can likely collapse to a plain switch on state.status with no
 * wallets lookup at all — safe to simplify then, not before.
 *
 * ORIGINAL PROBLEM, for context: calling wm.lock() (no id) does NOT produce
 * a LOCKED status on the pre-#77 version. It clears the *active* wallet id
 * and WDK reports NO_WALLET — the same raw status as "no wallet was ever
 * created". Trusting raw status alone would send an existing user back
 * through onboarding after every background/lock, even though their wallet
 * is still safely on disk.
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
 *
 * `retry` removed from this hook's return value — useWdkApp() no longer
 * exposes it as of PR #77 (`retry()` has been removed from useWdkApp` per
 * that PR's breaking-changes list). Its own guidance: re-call whichever
 * lifecycle method actually failed, rather than a generic app-level retry.
 * See app/index.tsx, the one consumer, for how its "Try again" button was
 * adjusted.
 */
export function useWdkSession(): { status: AppSessionStatus } {
  const { state } = useWdkApp();
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

  return { status };
}