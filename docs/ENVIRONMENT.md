# Environment Setup

Read this **before** running `npm install`. Nearly every confusing native
build failure this project has hit traced back to a toolchain mismatch, not
a code bug — and the failures rarely look like version problems. They look
like a generic native crash with no obvious cause.

## Required versions (pin these exactly, don't assume "latest works")

| Tool | Required | Why |
|---|---|---|
| Node.js | ≥ 20 | — |
| npm | **≥ 11.10.1** | Two separate, real reasons for this floor, not one: (1) npm 10 silently drops packages (like `expo` itself) from git-dependency trees, with no error — everything *looks* installed, but the app crashes at runtime with a missing-module error. (2) A confirmed, real npm CLI bug ([npm/cli#8726](https://github.com/npm/cli/issues/8726), open since 2021, affecting npm 9.x–11.x broadly) where `npm ci` can reject a lockfile `npm install` just generated, if a dependency's semver range could resolve to more than one valid version. This project has exactly that ambiguity between `@tetherto/wdk-wallet-btc` and `@tetherto/wdk-utils`'s differing `@noble/*` requirements — see `TROUBLESHOOTING.md`. **Be honest about this floor's real limit:** the underlying npm bug is reported across multiple majors, not tied to one specific version — 11.10.1 is a practical baseline that's worked in testing, not a version confirmed immune to the bug by npm's own maintainers. Check with `npm --version` before anything else. |
| JDK | **17** | JDK 21/24 cause Android codegen failures that surface as an unrelated-looking native crash (`PlatformConstants` `TurboModuleRegistry` errors), not a JDK error. |
| Expo SDK | **55** (not 56) | WDK's native modules are only validated against SDK 55. See the version-pin table below — this is enforced via `overrides` in `package.json`, not just convention. |
| React Native | 0.83.6 | Matches the SDK 55 baseline. |
| Global Expo CLI | **none** | Do not have a global `expo`/`expo-cli`/`eas-cli` install. A stale global CLI silently shadows the project's local one and causes the exact same `PlatformConstants` crash as the JDK issue, for a completely different reason. If you've ever run `npm install -g expo` or `expo-cli`, uninstall it: `npm uninstall -g expo expo-cli eas-cli`. |

**Golden rule:** always run `npm run android` / `npm run ios` (the local,
project-scoped CLI), never a bare `npx expo run:android` from a shell that
might resolve a global CLI first.

## Why these specific versions (the version-pin lessons)

A few dependencies in this project are pinned to an **exact** version, not
a caret range, and the reason is documented in-code as well as here — if
you ever "helpfully" loosen one of these to `^`, you will very likely
reintroduce a bug that already cost real debugging time:

- **`@tetherto/wdk-react-native-core`: exactly `1.0.0-beta.10`.**
  beta.10/beta.11 depend on `expo-crypto@^55` (SDK 55). beta.12+ jump to
  `expo-crypto@^56`, which crashes an SDK-55 app with
  `NoClassDefFoundError: ...AnyTypeCache` — a native crash that gives no
  hint it's a version mismatch. The `expo-crypto` override below exists as
  a second line of defense against this exact issue.
- **`@tetherto/wdk-worklet-bundler`: pinned to a specific fork/branch.**
  The published `beta.4` ships with no `dist/` folder at all — completely
  broken. The `overrides` entry forces the whole dependency tree onto the
  working version regardless of what any package's own `package.json` asks
  for.
- **`expo-crypto`: `~55.0.16` override.** Belt-and-suspenders against the
  core-version issue above — even if something transitively asks for a
  56.x range, this forces it back to the SDK-55-compatible version.
- **`@tetherto/wdk-indexer-http`: pinned to a specific GitHub commit, not a
  version string.** Not yet on the public npm registry (confirmed
  directly — `npm view` returns "Not Found") — same situation as
  `wdk-worklet-bundler` above. No tagged releases exist yet, so a specific
  commit hash is used rather than a floating branch reference that could
  change unexpectedly underneath this project.

If `npm install` ever suggests a newer version for any of these three,
**don't take it** without first checking `docs/TROUBLESHOOTING.md` and the
relevant package's changelog.

## Fresh install checklist

```bash
node --version   # >= 20
npm --version    # >= 11.10.1 — if not, `npm install -g npm@latest`
java --version   # exactly 17

npm install
# postinstall runs `wdk-worklet-bundler generate`, producing .wdk-bundle/
# (gitignored — regenerated on every install, don't commit it)

ls .wdk-bundle/wdk-worklet.bundle.js   # should exist after install
ls node_modules/expo/package.json     # sanity check npm actually installed everything

npx expo prebuild --clean
npm run android   # or: npm run ios
```

## Platform-specific setup

- **Android**: `minSdkVersion 29` is required (set via `expo-build-properties`
  in `app.json`) — some WDK chain packages need it.
- **Android — Auto Backup vs. Keystore-encrypted secrets:** this app uses
  `expo-secure-store` (Android-Keystore-backed) for genuinely sensitive
  local data (the password vault). Android's Auto Backup can restore other
  app data from Google Drive on reinstall, but Keystore-encrypted secrets
  are non-exportable and can't be properly restored — a known failure mode
  where an app appears to have a wallet but rejects the correct password
  after a reinstall/restore cycle (see `TROUBLESHOOTING.md`). Expo's own
  docs say `expo-secure-store` should already exclude itself from Auto
  Backup by default, but this app makes it explicit rather than relying on
  an unconfirmed default — `app.json`'s plugins array should include:
  ```json
  ["expo-secure-store", { "configureAndroidBackup": true }]
  ```
  If you ever see the "password rejected after reinstall" symptom, confirm
  this config is still present and hasn't been silently overridden by
  another plugin touching the same native manifest section, before
  assuming it's a new bug.
- **iOS**: the `modules/cloud-backup/withModularHeaders.js` config plugin is
  required for CocoaPods modular-headers issues caused by Google Sign-In's
  Firebase pods and Spark wallet's gRPC/SwiftNIO pods. It's already
  registered in `app.json` — you shouldn't need to touch it unless you add
  new native dependencies that reintroduce a similar pod conflict.
- **iOS — Keychain survives app deletion.** This is documented, expected
  Apple/Expo behavior, not a bug to try to fix at the storage layer — code
  that needs data to genuinely reset on a fresh install (this app's
  multi-account list, for example) needs to be designed around this
  directly rather than assume deletion clears Keychain-backed storage. See
  `ARCHITECTURE.md`'s "Multi-account architecture" section for a real case
  where this was learned the hard way.

## Network display labels — EXPO_PUBLIC_BTC_NETWORK_LABEL / EXPO_PUBLIC_EVM_ETHEREUM_NETWORK_LABEL

Real bug fixed by these two vars: Bitcoin and Ethereum are each
configurable per-deployment (either can point at mainnet OR a testnet —
see the provider vars in `.env.example`), but the app previously showed a
fixed, hardcoded network name ("Ethereum") regardless of which was
actually configured. Someone testing against Sepolia saw an unlabeled
"Ethereum" balance — which reasonably reads as mainnet by default, a
genuine risk in a wallet app.

Rather than splitting into fully separate network slots for each
mainnet/testnet pair (a much larger structural change — see
`ARCHITECTURE.md`'s "Network identity" section for the full reasoning on
why that wasn't the right call here), these two vars let the SAME network
slot carry an accurate, current label. Set to the testnet's real name
when testing (`Sepolia`, `Testnet`), and leave blank the moment you
repoint either provider to real mainnet — the label updates automatically
everywhere it's shown, no code change needed.

Arbitrum and Polygon have no equivalent var — they're mainnet-only by
explicit team decision (see `WDK_INTEGRATION.md`), so there's no
mainnet/testnet ambiguity to resolve for them.

## When something breaks and you don't know why

1. Confirm `npm --version` and `java --version` first — they cause the most
   misleading failures.
2. `rm -rf node_modules package-lock.json android ios && npm install &&
npx expo prebuild --clean` — a full clean rebuild resolves most native
   state corruption issues.
3. Check `docs/TROUBLESHOOTING.md` for this exact error message — several
   entries there look like unrelated native crashes but have a specific,
   known root cause.