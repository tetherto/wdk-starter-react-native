// src/wdk/cloudBackupEncryption.ts
//
// AES-256-GCM payload encryption for cloud backup, backed by @tetherto/wdk-utils
// — the same primitive already used for the app password vault
// (see wdk/passwordVault.ts). Thin wrapper matching the showcase's
// payloadEncryption.ts naming/shape for consistency with the wider WDK
// ecosystem.
//
// UNLIKE the showcase (which uses a single fixed EXPO_PUBLIC_CLOUD_BACKUP_
// PASSPHRASE shared by every install of the app — explicitly flagged in
// their own code as "DEMO ONLY, never do this in production"), this app
// encrypts with the PERSON'S OWN app password, recovered via
// passwordVault.getAppPassword(). That's a materially better security
// property: a stolen cloud backup can't be decrypted by anyone who merely
// has a copy of the app's bundled code — they'd also need the specific
// person's password.
//
// crypto.getRandomValues (needed by @noble/ciphers under the hood) is
// polyfilled once at app startup — see wdk/cryptoPolyfill.ts, imported in
// _layout.tsx.

import { encrypt, decrypt, type EncryptedPayload as WdkEncryptedPayload } from '@tetherto/wdk-utils';

export type EncryptedPayload = WdkEncryptedPayload;

/**
 * Encrypts a plaintext string with AES-256-GCM using a passphrase-derived key
 * (scrypt, DEFAULT_SCRYPT_PARAMS — the STRONG default, unlike the
 * intentionally-fast params used for the password vault's internal key
 * wrapping. This IS the case where strong scrypt matters: we're deriving
 * directly from the person's real, human-memorable password, protecting data
 * that leaves the device for a third-party cloud service.)
 */
export async function encryptPayload(
  plaintext: string,
  passphrase: string
): Promise<EncryptedPayload> {
  return encrypt(plaintext, passphrase);
}

/** Decrypts an EncryptedPayload produced by encryptPayload(). */
export async function decryptPayload(
  payload: EncryptedPayload,
  passphrase: string
): Promise<string> {
  try {
    return decrypt(payload, passphrase);
  } catch {
    throw new Error(
      'Decryption failed. The password may be incorrect, or the ' +
      'backup payload may be corrupted.'
    );
  }
}
