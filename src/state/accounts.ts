import { create } from 'zustand';

/**
 * Multi-account state — owned entirely by this app, not WDK.
 *
 * REWRITTEN: no disk persistence at all, per explicit direction after a
 * real, confirmed bug. This USED to persist via expo-secure-store, which —
 * per Expo's OWN documentation — is expected to survive app uninstallation
 * on iOS ("data stored with expo-secure-store will persist across app
 * uninstallations when the app is reinstalled with the same bundle ID...
 * this is expected behavior of the iOS Keychain system"). That's exactly
 * what caused a real bug: deleting the app and importing a DIFFERENT
 * wallet still showed the OLD wallet's 8 accounts, because this store's
 * data was never actually removed by the deletion at all.
 *
 * Now purely in-memory: which accounts exist, their names, and which is
 * active all live only in JS memory and reset to just Account 1 on every
 * cold app launch. Nothing here is WDK-derived data being "lost" — the
 * actual addresses/balances for any account index still exist and are
 * still derivable the moment anything asks for them (see
 * useWalletData.ts) — this store only tracks which indices the person has
 * chosen to surface in the UI, and that's exactly the kind of thing that
 * should NOT survive a fresh install of a possibly-different wallet.
 *
 * Real UX trade-off, stated plainly rather than glossed over: if someone
 * added a 2nd/3rd account, force-quits the app, and reopens it, they'll
 * see just Account 1 again — they'd need to tap "Add account" again to
 * bring the others back into view (the underlying funds/addresses at
 * those indices are completely unaffected; only which ones this app
 * currently displays resets).
 */

interface AccountsState {
  indices: number[];
  activeIndex: number;
  names: Record<number, string>;
  setActive: (index: number) => void;
  addAccount: () => number; // returns the new index
  rename: (index: number, name: string) => void;
  /** Called once by AccountDiscovery after checking a bounded set of
   * indices for real on-chain activity — surfaces any that genuinely have
   * a balance, since nothing about which accounts exist is persisted
   * anymore (see this file's header comment). Merges with whatever's
   * already known rather than blindly overwriting, so an account added
   * manually mid-session isn't lost if discovery finishes afterward. */
  mergeDiscovered: (discoveredIndices: number[]) => void;
}

function defaultName(index: number): string {
  return `Account ${index + 1}`;
}

export const useAccounts = create<AccountsState>((set, get) => ({
  indices: [0],
  activeIndex: 0,
  names: { 0: defaultName(0) },

  setActive: (index) => set({ activeIndex: index }),

  addAccount: () => {
    const { indices, names } = get();
    const newIndex = Math.max(...indices) + 1;
    set({
      indices: [...indices, newIndex],
      names: { ...names, [newIndex]: defaultName(newIndex) },
      activeIndex: newIndex,
    });
    return newIndex;
  },

  rename: (index, name) => {
    set((state) => ({ names: { ...state.names, [index]: name } }));
  },

  mergeDiscovered: (discoveredIndices) => {
    set((state) => {
      const merged = Array.from(new Set([...state.indices, ...discoveredIndices])).sort((a, b) => a - b);
      const names = { ...state.names };
      merged.forEach((i) => {
        if (!(i in names)) names[i] = defaultName(i);
      });
      return { indices: merged, names };
    });
  },
}));
