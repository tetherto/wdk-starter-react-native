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

This PR covers the full core wallet experience end to end, against real
WDK + real external services — not mocked, not a design approximation of
the prototype but a direct match against its actual markup/CSS:

**Onboarding & security**
- Welcome → create or import a wallet; recovery phrase generation/reveal
  and import, both with a 12-or-24-word choice and paste-distribution
  across the word grid
- App password creation, backed by real envelope encryption (not just a
  UI field)
- Cloud backup: the person chooses **either** iCloud **or** Google Drive,
  on **either** platform — encrypted with their own app password, not a
  fixed passphrase
- App lock/unlock, tested and fixed across iOS/Android's different
  background-transition behavior

**Wallet**
- Real multi-network balances — Bitcoin, Ethereum (Sepolia testnet),
  Arbitrum and Polygon (real mainnet) — with real USD totals and per-asset
  fiat values (CoinGecko)
- Multi-account support: switching between accounts on one wallet, with
  bounded automatic discovery of previously-used accounts after a fresh
  import (see `docs/ARCHITECTURE.md` for the real, stated limits of this —
  it's not unlimited, and can't discover a genuinely zero-activity
  account)
- Receive: network/token picker, real QR code, copy/share
- Send: pick a token → amount (crypto/fiat toggle) → review (real fee
  quoting) → confirm — **executes a real, live send**, covering both
  native assets and ERC-20 tokens (USDT/USDT0) → success, with a working
  link to a real block explorer for the actual transaction
- Activity: real transaction history via the WDK Indexer API, with
  chain/token/type filters that only ever show combinations that actually
  exist (no "Bitcoin + ETH" nonsense), grouped by Today/Yesterday/Earlier

**Everywhere**
- A fully responsive UI system — every screen scales correctly across
  phone and tablet

**Not yet built**, so you don't assume otherwise: restoring a wallet *from*
a cloud backup (the download/decrypt side — upload works, download doesn't
have a screen yet), and Tron/GasFree support (on hold — see
`docs/WDK_INTEGRATION.md`).

**A known, currently unresolved issue** worth reading about before you
assume it's something you broke: EVM balance fetches can begin timing out
after an extended session, across all EVM networks simultaneously,
regardless of RPC provider — traced directly to how WDK's own package
manages its underlying provider connections, not something fixable from
this app's code. See `docs/TROUBLESHOOTING.md`'s last entry.

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
| Data layer | TanStack Query — WDK hooks called directly from screens (an earlier mock/WDK DI seam exists in `src/data/` but is no longer used by any screen; see `docs/ARCHITECTURE.md`) |
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
