import { create } from 'zustand';

/**
 * A short-lived flag: "a send just completed, keep polling balances for a
 * while." Set by send/review.tsx right after a successful send; consumed
 * by Home and each Accounts row.
 *
 * Why this exists, not just a single refetch-on-focus: a send's returned
 * hash means the transaction was SUBMITTED, not that it's been MINED yet.
 * A single refetch — however it's triggered — can easily land before the
 * chain has actually caught up, correctly showing the pre-send balance
 * (not a bug, just an unconfirmed tx). Polling for a short window after a
 * send catches the real update whenever it actually lands, rather than
 * gambling on one refetch's timing. This also covers the recipient's
 * account, which has no navigation event of its own to react to at all.
 */
interface PendingRefreshState {
  pending: boolean;
  markPending: () => void;
  clear: () => void;
}

export const usePendingRefresh = create<PendingRefreshState>((set) => ({
  pending: false,
  markPending: () => set({ pending: true }),
  clear: () => set({ pending: false }),
}));

/** Poll delays (ms) after a send — a few quick checks, then wider-spaced
 * ones, covering ~30s total without hammering the RPC provider. */
export const POLL_DELAYS_MS = [4000, 8000, 15000, 25000];
