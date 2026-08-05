import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { encrypt, decrypt, type EncryptedPayload } from '@tetherto/wdk-utils';

/**
 * App password vault — envelope encryption (see the earlier version's notes
 * on the security tradeoff: the app can recover the real password, not just
 * verify a guess, because cloud-backup needs it).
 *
 * PERFORMANCE FIX: wdk-utils' default scrypt cost (N=2^16) is tuned for
 * deriving a key from a WEAK, human-memorable secret — that's the whole
 * point of scrypt, to make guessing such a secret slow. But encrypt()/
 * decrypt() here are called with the VAULT KEY as the "password" argument
 * (see getOrCreateVaultKey below), not the person's typed password directly.
 * The vault key is already a cryptographically random 256-bit value — there
 * is nothing weak to stretch, so running expensive scrypt on it burns CPU
 * time (and blocks the JS thread, since @noble/hashes' scrypt is synchronous
 * pure-JS with no native acceleration) for zero additional security. That's
 * what was making both password setup and unlock feel slow/frozen.
 *
 * VAULT_WRAP_SCRYPT_PARAMS below deliberately uses a minimal cost for THIS
 * specific step. decrypt() reads back whatever scrypt params were used at
 * encrypt time from the payload itself, so this doesn't need to be repeated
 * anywhere else.
 *
 * ⚠️ DO NOT reuse VAULT_WRAP_SCRYPT_PARAMS for anything that encrypts
 * directly with the person's real typed password (e.g. the future
 * cloud-backup payload encryption) — that IS the scenario scrypt's cost is
 * meant to protect, since a real password is exactly the kind of weak,
 * guessable secret an attacker might brute-force offline against an
 * exfiltrated cloud blob. Use wdk-utils' DEFAULT_SCRYPT_PARAMS (or stronger)
 * there.
 */
const VAULT_WRAP_SCRYPT_PARAMS = { N: 2 ** 4, r: 8, p: 1 };

const VAULT_KEY_STORE_KEY = 'wdk_vault_key_v1';
const PASSWORD_PAYLOAD_STORE_KEY = 'wdk_app_password_v2';

async function getOrCreateVaultKey(): Promise<string> {
  const existing = await SecureStore.getItemAsync(VAULT_KEY_STORE_KEY);
  if (existing) return existing;

  const randomBytes = await Crypto.getRandomBytesAsync(32);
  const vaultKeyHex = Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  await SecureStore.setItemAsync(VAULT_KEY_STORE_KEY, vaultKeyHex);
  return vaultKeyHex;
}

/** Sets (or replaces) the app password. Called at wallet creation/import. */
export async function setAppPassword(password: string): Promise<void> {
  const vaultKey = await getOrCreateVaultKey();
  const payload = encrypt(password, vaultKey, VAULT_WRAP_SCRYPT_PARAMS);
  await SecureStore.setItemAsync(PASSWORD_PAYLOAD_STORE_KEY, JSON.stringify(payload));
}

/**
 * Recovers the actual plaintext app password. Used by screens (like
 * cloud-backup) that need to encrypt/decrypt something with it, without
 * re-prompting the user. Returns null if no password has been set yet.
 */
export async function getAppPassword(): Promise<string | null> {
  const [vaultKey, raw] = await Promise.all([
    SecureStore.getItemAsync(VAULT_KEY_STORE_KEY),
    SecureStore.getItemAsync(PASSWORD_PAYLOAD_STORE_KEY),
  ]);
  if (!vaultKey || !raw) return null;
  try {
    const payload = JSON.parse(raw) as EncryptedPayload;
    // Note: no scryptParams passed here — decrypt() reads scryptN/R/P back
    // out of the stored payload itself, so it automatically matches whatever
    // was used at encrypt time.
    return decrypt(payload, vaultKey);
  } catch {
    return null;
  }
}

/** Verifies a password attempt by recovering the real password and comparing. */
export async function verifyAppPassword(password: string): Promise<boolean> {
  const real = await getAppPassword();
  return real !== null && real === password;
}

/** Whether an app password has been set yet. */
export async function hasAppPassword(): Promise<boolean> {
  return (await SecureStore.getItemAsync(PASSWORD_PAYLOAD_STORE_KEY)) != null;
}

/** Clears the stored password and vault key — e.g. when the wallet is deleted. */
export async function clearAppPassword(): Promise<void> {
  await SecureStore.deleteItemAsync(PASSWORD_PAYLOAD_STORE_KEY);
  await SecureStore.deleteItemAsync(VAULT_KEY_STORE_KEY);
}