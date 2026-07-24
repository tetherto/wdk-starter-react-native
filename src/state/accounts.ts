import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

/**
 * Multi-account state — owned entirely by this app, not WDK.
 *
 * WDK itself has NO concept of "a list of accounts" — confirmed directly
 * against its source: accountIndex is just a plain number used for
 * on-demand HD derivation (useAccount({ network, accountIndex }) works for
 * ANY index, no persisted account list at the SDK level). This means the
 * app has to own: which account indices exist, what each is named, and
 * which one is currently active. "Adding an account" is therefore genuinely
 * instant and needs no WDK call at all — it's the SAME seed, just a new
 * derivation index; WDK derives real addresses/balances for it the moment
 * anything asks for that index.
 *
 * Persisted via expo-secure-store (reusing the same mechanism as
 * passwordVault.ts, rather than adding a new storage dependency for what's
 * genuinely small, non-secret data — just indices and display names).
 */

const STORE_KEY = 'wdk_accounts_v1';

interface PersistedAccountsState {
  indices: number[];
  activeIndex: number;
  names: Record<number, string>;
}

interface AccountsState extends PersistedAccountsState {
  isHydrated: boolean;
  hydrate: () => Promise<void>;
  setActive: (index: number) => void;
  addAccount: () => number; // returns the new index
  rename: (index: number, name: string) => void;
}

function defaultName(index: number): string {
  return `Account ${index + 1}`;
}

async function persist(state: PersistedAccountsState): Promise<void> {
  try {
    await SecureStore.setItemAsync(STORE_KEY, JSON.stringify(state));
  } catch {
    // best-effort — losing a persistence write here just means the list
    // resets to its last-saved state on next launch, not a crash
  }
}

export const useAccounts = create<AccountsState>((set, get) => ({
  indices: [0],
  activeIndex: 0,
  names: { 0: defaultName(0) },
  isHydrated: false,

  hydrate: async () => {
    if (get().isHydrated) return;
    try {
      const raw = await SecureStore.getItemAsync(STORE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as PersistedAccountsState;
        set({ ...parsed, isHydrated: true });
        return;
      }
    } catch {
      // fall through to defaults below
    }
    set({ isHydrated: true });
  },

  setActive: (index) => {
    set({ activeIndex: index });
    const { indices, activeIndex, names } = get();
    persist({ indices, activeIndex, names });
  },

  addAccount: () => {
    const { indices, names } = get();
    const newIndex = Math.max(...indices) + 1;
    const nextIndices = [...indices, newIndex];
    const nextNames = { ...names, [newIndex]: defaultName(newIndex) };
    set({ indices: nextIndices, names: nextNames, activeIndex: newIndex });
    persist({ indices: nextIndices, activeIndex: newIndex, names: nextNames });
    return newIndex;
  },

  rename: (index, name) => {
    const { names, indices, activeIndex } = get();
    const nextNames = { ...names, [index]: name };
    set({ names: nextNames });
    persist({ indices, activeIndex, names: nextNames });
  },
}));
