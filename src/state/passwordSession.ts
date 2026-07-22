import { create } from 'zustand';

interface PasswordSessionState {
  password: string | null;
  setPassword: (password: string | null) => void;
  clear: () => void;
}

/**
 * Holds the app password IN MEMORY ONLY, for the current unlocked session —
 * NEVER written to disk, SecureStore, or anywhere persistent, in any form.
 *
 * Why this exists: the cloud-backup screen (right after password/unlock)
 * needs the actual password to encrypt/decrypt the backup payload with
 * wdk-utils. Rather than prompt for it a second time immediately after the
 * user just typed it, we keep it here for the rest of this session.
 *
 * It is cleared:
 *   - whenever the wallet locks (see AutoLockOnBackground), and
 *   - on a fresh app launch, since this is a plain in-memory store — nothing
 *     repopulates it until the person enters their password again on unlock.
 *
 * If a screen needs the password and this is null (e.g. cloud backup reached
 * some other way, or after a cold start), it must prompt for the password
 * again rather than assume it's available.
 */
export const usePasswordSession = create<PasswordSessionState>((set) => ({
  password: null,
  setPassword: (password) => set({ password }),
  clear: () => set({ password: null }),
}));
