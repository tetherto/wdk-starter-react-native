/**
 * Wallet identity strategy.
 *
 * WDK identifies each wallet (seed) by a user-supplied ID — in the WDK showcase
 * this is an email the user types in. The starter uses a FIXED default ID for a
 * simple single-wallet UX (no identity step in onboarding).
 *
 * ── FUTURE EXTENSION POINT ──────────────────────────────────────────────────
 * To support user-chosen IDs / multiple wallets (like the showcase), stop using
 * DEFAULT_WALLET_ID and thread a real ID from the UI through:
 *   - createWallet(id) / restoreWallet(mnemonic, id) / unlock(id)
 * Everything else (data hooks, session bridge) already keys off activeWalletId,
 * so this constant is the ONLY thing that needs to change.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export const DEFAULT_WALLET_ID = 'primary';
