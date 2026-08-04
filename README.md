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

This app implements the full core wallet experience end to end, against
real WDK + real external services — not mocked, not a design
approximation of the prototype but a direct match against its actual
markup/CSS:

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

## Getting started

> **Check `npm --version` before anything else.** npm 10 silently drops
> packages from git-dependency trees — no error, just a missing package
> later on, for a reason that looks completely unrelated. This project has
> three (see the note right after these steps). npm 11+ is required —
> see `docs/ENVIRONMENT.md` for the exact version and how to check/upgrade.

```bash
# 1. Read docs/ENVIRONMENT.md first — Node/npm/JDK version mismatches
#    cause confusing native build failures, not clean errors.

# 2. Install (also regenerates the WDK worklet bundle automatically —
#    see the `postinstall` script in package.json)
npm install

# 3. Copy the env template and fill in what you need — see the table
#    below for what's actually required vs. optional. You can genuinely
#    leave everything blank and still boot the app; balances, sending,
#    and Activity just won't work until their specific keys are set.
cp .env.example .env

# 4. Generate native projects
npx expo prebuild --clean

# 5. Run
npm run ios       # or
npm run android
```

The values already sitting in `.env.example` for Bitcoin (Testnet3) and
Ethereum (Sepolia) are real, working, free public endpoints — not
placeholders you need to replace — so filling those in gets you real
balances and sending on two networks with no signups at all.
`EXPO_PUBLIC_WDK_INDEXER_API_KEY` needs its own free registration (link in
`.env.example`) before the Activity tab shows anything. Arbitrum/Polygon
and cloud backup are real mainnet / real external accounts — see "Making
it your own" below and `docs/CLOUD_BACKUP.md` — skip both if you just
want to see the app work end to end on testnets.

**A known, stated risk worth knowing about up front, not discovering the
hard way:** three dependencies in `package.json` point at specific GitHub
forks/commits, not published npm releases —
`@tetherto/wdk-backup-cloud`, `@tetherto/wdk-indexer-http`, and
`@tetherto/wdk-worklet-bundler`. Each exists because the official
published version had a real, confirmed bug at the time (the worklet
bundler's official beta, for example, shipped with no `dist/` at all —
completely unusable). Running `npm install` on this project means
implicitly depending on three third-party GitHub accounts staying
reachable and those specific commits staying available. If one of these
starts failing to resolve, that's almost certainly why — check whether
the upstream package has since published a real, fixed release you could
switch to instead of the pinned fork.

### Which `.env` keys are required vs. optional — the short version

| Required for... | Keys |
|---|---|
| App to boot at all | None |
| Activity tab to show anything | `EXPO_PUBLIC_WDK_INDEXER_API_KEY` |
| Real balances (any one network) | That network's `_PROVIDER` (+ `_BUNDLER_URL`/`_PAYMASTER_URL` for EVM chains) |
| Cloud backup | See `docs/CLOUD_BACKUP.md` — several accounts/credentials, not a quick add |
| Shipping your own build | See "Making it your own" below |

Every key's own comment in `.env.example` explains what breaks without it —
nothing fails silently or produces a confusing error for a key you simply
haven't set yet, with the one exception of cloud backup's provider-specific
sign-in errors (see `docs/CLOUD_BACKUP.md`'s troubleshooting section).

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

## Making it your own

Everything below is about forking this to ship a *different* app under
your own identity — none of it is needed just to run/test the starter as
it is (see the checklist above).

**Update these via `.env`, not by editing `app.json` directly** —
`app.config.js` reads each one and wires it into the native config for
you (regenerating the entitlement, the Google Sign-In URL scheme, etc.),
so there's exactly one place to change each value, not several kept in
sync by hand:

| What | `.env` key | Notes |
|---|---|---|
| iOS bundle identifier | `IOS_BUNDLE_IDENTIFIER` | Build-time only — changing this needs `npx expo prebuild --clean`, not just a reload |
| Android package name | `ANDROID_PACKAGE_NAME` | Same as above |
| CloudKit container | `EXPO_PUBLIC_CLOUDKIT_CONTAINER_ID` | Also drives `ios.entitlements` automatically. Container must actually exist in the Apple Developer portal — see `docs/CLOUD_BACKUP.md` |
| Google Sign-In iOS URL scheme | *(nothing to set — derived automatically)* | Computed from `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`, which you do need to set — see `docs/CLOUD_BACKUP.md` |
| App name / EAS project | `EAS_PROJECT_SLUG`, `EAS_PROJECT_ID` | Only needed if you're using EAS Build — see `docs/RELEASE.md` |
| Deep-link / OAuth-redirect scheme | *(edit `app.json`'s `scheme` directly — not yet env-driven)* | If you have this app *and* an unmodified clone of it both installed on the same device, an unchanged scheme makes deep links ambiguous between them — real, not theoretical, if you're actively developing against your own fork alongside a reference install |

Current default identity, if you want to know what you're replacing:
bundle ID / package name `io.tether.wdk.starter.react.native`, CloudKit
container `iCloud.io.tether.wdkshowcase` (intentionally *not* derived from
the bundle ID — Apple permits this, and this app deliberately keeps an
older container name; see `docs/ARCHITECTURE.md`).

**If you're building via the CI pipeline (`docs/RELEASE.md`), not just
locally:** `IOS_BUNDLE_IDENTIFIER` and `ANDROID_PACKAGE_NAME` are new as of
this change and aren't yet wired into that pipeline — per `RELEASE.md`'s
own note that adding a variable means updating both the workflow's
job-level `env:` blocks and the `put` list in
`.github/actions/write-dotenv/action.yaml`. Setting them locally in `.env`
is enough for `npm run ios`/`android`; a CI-produced build won't see them
until those two files are updated too.

**Everything else that's identity-shaped, not covered by the table above:**
- App name, icon, splash screen — plain fields/asset paths in `app.json`,
  no env indirection needed for these.
- Google OAuth clients (Web + iOS), CloudKit API token — real external
  accounts you create yourself; see `docs/CLOUD_BACKUP.md` for the full
  walkthrough of both.
- **Shipping to the actual App Store / Play Store** — a substantially
  bigger checklist than anything above (signing credentials, store
  listings, provisioning profiles with the right entitlements). See
  [`docs/RELEASE.md`](docs/RELEASE.md)'s "One-time setup" section — it's
  written as a literal, sequential checklist for exactly this.

## Releasing

Signed builds and store submission run through the
[Build and Publish](.github/workflows/build-and-publish.yaml) GitHub Actions
workflow — `eas build --local`, then `eas submit` to TestFlight and the Play
internal track.

See [`docs/RELEASE.md`](docs/RELEASE.md) for how the pipeline works, the secret
inventory, and the one-time setup still outstanding — the workflow has never
been run.

## License

Apache-2.0 — see [`LICENSE`](LICENSE).

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for the branch strategy and coding
conventions used in this repo.