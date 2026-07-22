# WDK Starter Wallet (React Native)

> ⚠️ **Alpha software.** Under active development. Do not use with real funds
> until a stable release is tagged.

A reference **non-custodial wallet** built with Expo + React Native on
Tether's [WDK (Wallet Development Kit)](https://wallet.tether.io/). This
repo exists to teach other developers, end to end, how to integrate WDK into
a real app — every architectural decision, and every hard-won bug fix along
the way, is documented rather than hidden.

If you're new here, **read the docs in this order**:

1. [`docs/ENVIRONMENT.md`](docs/ENVIRONMENT.md) — toolchain versions that
   actually work. Read this *before* running `npm install`.
2. [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — how the app is put
   together and why.
3. [`docs/WDK_INTEGRATION.md`](docs/WDK_INTEGRATION.md) — the WDK
   integration itself, step by step.
4. [`docs/SECURITY.md`](docs/SECURITY.md) — the password/lock architecture.
5. [`docs/CLOUD_BACKUP.md`](docs/CLOUD_BACKUP.md) — iCloud/Google Drive
   backup, including the external account setup you'll need to do yourself.
6. [`docs/TROUBLESHOOTING.md`](docs/TROUBLESHOOTING.md) — a running list of
   real bugs we hit and how they were fixed, so you don't rediscover them.

## What's actually built right now

This PR completes the **onboarding flow** end to end, against a real WDK
wallet (not mocked):

- Welcome → create or import a wallet
- Recovery phrase generation/reveal, with a 12-or-24-word choice
- Recovery phrase import (12 or 24 words), with paste-distribution across
  the word grid
- App password creation, backed by real encryption (not just a UI field)
- Cloud backup: the person chooses **either** iCloud **or** Google Drive,
  on **either** platform — encrypted with their own app password, not a
  fixed passphrase
- App lock/unlock, tested and fixed across both iOS and Android's different
  background-transition behavior
- A fully responsive UI system — every screen scales correctly across
  phone and tablet, verified on iPhone, iPad, and Android

Everything above was built by extracting the exact markup/CSS from the
project's own HTML prototype and matching it precisely — this is not an
approximation of the design.

**Not yet built**, so you don't assume otherwise: restoring a wallet *from*
a cloud backup (the download/decrypt side — upload works, download doesn't
have a screen yet), and the wallet's main dashboard/send/receive/activity
screens haven't had the same prototype-matching design pass as onboarding.

## Quick start

```bash
# 1. Read docs/ENVIRONMENT.md first — Node/npm/JDK version mismatches
#    cause confusing native build failures, not clean errors.

# 2. Install
npm install

# 3. Copy env template and fill in what you need (see docs/CLOUD_BACKUP.md
#    if you want cloud backup working; the rest of the app works without it)
cp .env.example .env

# 4. Generate native projects
npx expo prebuild --clean

# 5. Run
npm run ios       # or
npm run android
```

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Expo SDK 55 (managed, with `expo prebuild`), React Native 0.83 |
| Navigation | Expo Router (file-based) |
| Wallet SDK | `@tetherto/wdk-react-native-core` + `@tetherto/wdk` (Bare-runtime worklet architecture — see [`ARCHITECTURE.md`](docs/ARCHITECTURE.md)) |
| Data layer | TanStack Query, behind a DI seam so WDK/mock are interchangeable |
| State | Zustand (small, single-purpose stores — session, password session, lock suppression) |
| Encryption | `@tetherto/wdk-utils` (AES-256-GCM + scrypt) |
| Secure storage | `expo-secure-store` (iOS Keychain / Android Keystore) |
| Cloud backup | `@tetherto/wdk-backup-cloud` — CloudKit (via WebView) + Google Drive |
| Language | TypeScript, strict mode |

## Project name and identifiers

- Bundle ID / package name: `io.tether.wdkstarterreactnative`
- If you fork this for your own app, update `app.json`'s `ios.bundleIdentifier`
  and `android.package` — several native setup steps (Google OAuth clients,
  Apple's CloudKit container) are tied to these identifiers.

## License

Apache-2.0 — see [`LICENSE`](LICENSE).

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for the branch strategy and coding
conventions used in this repo.
