# Security Architecture

This covers the app password, lock/unlock, and what protects what. Read
this before changing anything in `src/wdk/passwordVault.ts`,
`src/wdk/hooks/AutoLockOnBackground.tsx`, or `src/wdk/hooks/WdkSessionGate.tsx`
— each of these has a non-obvious reason for being shaped the way it is.

## What WDK itself protects, independent of anything in this app

The wallet seed/keys are stored via WDK's own secure-storage layer
(`wdk-react-native-secure-storage`), backed by the OS's real secure storage
— iOS Keychain / Android Keystore — with biometric/passcode gating. This
happens automatically on `unlock()`/`getMnemonic()`. **This app does not
implement its own seed encryption** — it relies on WDK for that layer
entirely.

## The app password — envelope encryption, and why

On top of WDK's own protection, this app adds a **required app password**:
the wallet will not unlock without it, even if the device's biometrics
would otherwise satisfy WDK.

`src/wdk/passwordVault.ts` uses **envelope encryption**:

1. A random 256-bit "vault key" is generated once (`expo-crypto`) and
   stored in `expo-secure-store` (OS Keychain/Keystore).
2. The actual password is encrypted **with that vault key** using
   `@tetherto/wdk-utils` (AES-256-GCM), and the resulting payload is
   stored — meaningless without the vault key.
3. To recover the password (`getAppPassword()`): read the vault key,
   decrypt the payload.

**This is a genuine, stated security tradeoff, not an oversight:** an
earlier version used a one-way verifier (encrypt a fixed known string with
the password; a correct guess is the only thing that can decrypt it back
to that string) — which made it *structurally impossible* to ever recover
the plaintext password. This version can. The tradeoff was made
deliberately, because the cloud-backup feature needs the actual password
to encrypt the backup payload without re-prompting the person mid-flow. If
you're extending this app and don't need that, consider whether the
one-way verifier is a better fit for your use case.

**Performance note, also load-bearing for correctness:** the vault-key
wrapping step (`setAppPassword`/`getAppPassword`) uses **deliberately weak**
scrypt parameters (`VAULT_WRAP_SCRYPT_PARAMS`, `N: 2^4` vs. the library
default `N: 2^16`). This is safe *specifically because* the thing being
encrypted-with is already a cryptographically random 256-bit key, not a
human-memorable secret — there's nothing to "stretch" against brute force
gains. **Do not reuse `VAULT_WRAP_SCRYPT_PARAMS` anywhere that encrypts
directly with the person's real typed password** (e.g. the cloud-backup
payload, which uses the library's real default strength deliberately,
since that data leaves the device and a real password genuinely needs
brute-force resistance there).

## In-memory password session

`src/state/passwordSession.ts` holds the password in a plain Zustand store,
**never persisted to disk in any form**. Its entire purpose is letting the
screen immediately after password entry (cloud-backup) reuse it without a
second prompt. It's cleared the instant the wallet locks
(`AutoLockOnBackground`) and is simply empty again after any cold start.

## The lock/unlock chain, and real bugs it took to get right

Three components work together: `AutoLockOnBackground` (calls `lock()` on
real backgrounding), `WdkSessionGate` (watches for a lock and redirects to
`/unlock` from anywhere in the app), and `unlock.tsx` (verifies the
password *before* WDK's own `unlock()` ever runs — a wrong password never
reaches WDK).

Real bugs found and fixed here, worth knowing before you touch this code:

1. **`lock()` and the `NO_WALLET` misreport** — see `WDK_INTEGRATION.md`.
   On the pre-#77 WDK version, `lock()` did not produce a distinct `LOCKED`
   status; WDK reported `NO_WALLET`, so `useWdkSession.ts` disambiguates
   using the persisted wallets list. As of `wdk-react-native-core` PR #77
   (tetherto/wdk-react-native-core#77) this is fixed upstream, but the
   disambiguation is deliberately kept as a safety net until verified on a
   real device — don't remove it yet. Note also from that PR: `lock()` is
   now async and shares an operation mutex, so `AutoLockOnBackground` must
   **await** it (`lock().catch(...).finally(clearPasswordSession)`) rather
   than fire it and clear the password session in parallel.
2. **`WdkSessionGate` must only redirect on a *genuine* `unlocked → locked`
   transition**, not any arrival at `locked`. Wallet creation itself
   briefly passes through a locked-looking state as a normal part of its
   own sequence (the wallet is registered in storage a moment before it's
   unlocked in memory) — reacting to *any* `locked` value bounced the user
   to `/unlock` mid-onboarding. Requiring the specific previous status to
   have been `'unlocked'` fixes this without needing to know *why* the
   status changed.
3. **iOS and Android report backgrounding differently.** iOS always passes
   through an intermediate `inactive` state
   (`active → inactive → background`); Android goes directly
   `active → background`. A check written as
   `prev === 'active' && next === 'background'` can never match on iOS,
   because by the time `next` is `'background'`, `prev` is always
   `'inactive'` there. Fixed by triggering on *reaching* `'background'`
   regardless of what preceded it.
4. **Some in-app flows cause a real, but false, backgrounding signal.**
   Google Sign-In's native Android picker launches a separate Activity,
   pausing the app's own Activity — indistinguishable from a real
   backgrounding via `AppState` alone. `src/state/lockSuppression.ts`
   exists specifically for this: calling code (`cloud-provider.tsx`) sets
   an explicit `suppress()`/`release()` around flows it knows will trigger
   this, so `AutoLockOnBackground` skips locking during them. CloudKit's
   WebView-based sign-in does **not** need this — it's a React Native
   `<Modal>` inside the app's own Activity, so it never causes a real
   `AppState` transition in the first place.
5. **A failed `lock()` used to leave the password resident in memory.**
   The original sequencing was `lock().then(clearPasswordSession).catch(...)`
   — `clearPasswordSession()` only ran on the success path, so if `lock()`
   itself rejected (e.g. the worklet call failed), the in-memory password
   session (`state/passwordSession.ts`) was never cleared, and stayed
   populated for as long as the app sat in the background. Fixed by
   restructuring to `lock().catch(...).finally(clearPasswordSession)` —
   `.finally()` runs regardless of whether `lock()` resolved or rejected,
   so the password is cleared unconditionally; the `.catch()` before it
   still logs the failure so it isn't left as an unhandled rejection.

## iOS Keychain survives app deletion — a platform quirk, not a bug

Deleting and reinstalling this app on iOS does **not** clear Keychain
entries — that's documented Apple behavior (Keychain is designed to
persist across reinstalls). This means WDK's own wallet registration can
survive a reinstall, causing `"A wallet with the ID 'primary' already
exists"` on a device that looks freshly installed.

**Fix in place:** `useWalletActions.importWallet()` catches this specific
error and self-heals: it calls `wm.deleteWallet(DEFAULT_WALLET_ID)` and
retries once. It does **not** retry on any other error — only this
specific, identifiable condition — so a genuine unrelated failure still
surfaces normally instead of being silently swallowed.

## Known limitations, stated plainly

- Wallet ID is a fixed constant (`'primary'`) — see `ARCHITECTURE.md`.
  Testing repeatedly under the same Apple ID/Google account will overwrite
  the same cloud-backup slot each time.
- The password vault's envelope design (above) trades some security for
  the cloud-backup convenience — know this before extending it elsewhere.
- No rate-limiting or lockout on repeated wrong-password attempts at the
  unlock screen.