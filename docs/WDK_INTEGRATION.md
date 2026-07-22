# WDK Integration — Step by Step

This documents how WDK was actually integrated into this app, in the order
it was done, including the decisions that turned out to matter and the ones
that were initially wrong. If you're integrating WDK into a *different* app,
this is the sequence to follow — do not skip straight to Step 5's code
without understanding why Steps 1–2 are structured this way.

## Step 0 — pick the right integration path

There are two ways to pull WDK into an RN app:

- **`@tetherto/wdk-react-native-provider`** — pulls in a large set of Node
  polyfills as direct dependencies. An earlier attempt at this integration
  used this path and hit sustained dependency hell (peer conflicts, native
  build failures). **Do not use this package.**
- **`@tetherto/wdk` + `@tetherto/wdk-react-native-core` + `bare-node-runtime`**
  — the path this app actually uses. Node-module needs are bundled *into*
  the Bare-runtime worklet at build time (via the worklet bundler), so the
  RN app itself needs no polyfill configuration and no metro resolver
  changes.

If you ever find yourself installing raw Node polyfills (`stream-browserify`,
`react-native-crypto`, etc.) to satisfy a peer-dependency warning, stop —
that's a sign you're on the wrong path.

## Step 1 — compile WDK in, prove the native build works

Packages: `@tetherto/wdk`, `@tetherto/wdk-react-native-core` (pinned exact —
see `ENVIRONMENT.md`), `bare-node-runtime`, plus
`@tetherto/wdk-worklet-bundler` (dev, pinned to a fork — the published
`beta.4` ships with no `dist/`, completely broken).

`wdk.config.js` at the project root defines which networks get compiled
into the worklet — start with one network to prove the pipeline, add more
later. The `postinstall` script (`wdk-worklet-bundler generate`) reads this
config and produces `.wdk-bundle/wdk-worklet.bundle.js` — gitignored,
regenerated on every install.

**The test for this step:** the app boots to your first screen with **no
crash**, before any screen calls a single WDK function. This proves the
native layer compiles and links correctly, isolated from any integration
logic bugs.

## Step 2 — initialize the worklet runtime

`WdkAppProvider` (from `wdk-react-native-core`) wraps the app, given
`wdkConfigs` (`src/wdk/config.ts`) and the generated bundle. `useWdkApp()`
exposes the worklet's lifecycle status:
`INITIALIZING → NO_WALLET | LOCKED | READY | ERROR`.

**The test for this step:** log `useWdkApp().state.status` and confirm you
see `INITIALIZING → NO_WALLET` on a fresh install — proving the Bare
worklet actually started, still without any wallet having been created.

## Steps 3–5 — real data, sending, wallet lifecycle

Built against WDK's **real, version-verified hook API**
(`useBalancesForWallet`, `useAccount`, `useWalletManager`, `useWdkApp`),
not assumptions carried over from a different SDK style. The key
architectural point: **WDK's API is hook-based, not repository-based** —
see `ARCHITECTURE.md` for why the integration layer is structured as hooks
(`src/wdk/hooks/`) rather than a plain service class.

Covered here:
- Real balances via `useBalancesForWallet(accountIndex, assets[], opts)` —
  note this is a *batch* call across assets, not one hook per asset.
- Real account/address via `useAccount({ network, accountIndex })`.
- Sending: `account.send({ to, amount, asset })` for native assets, with
  `BigNumber`-based base-unit conversion (amounts are in base units —
  satoshis, wei, etc. — not human-readable decimals).
- Wallet lifecycle: `generateMnemonic`, `restoreWallet`, `unlock`, `lock`,
  `getMnemonic`, `deleteWallet`, `getSeedAndEntropyFromMnemonic` (used for
  cloud backup — see `CLOUD_BACKUP.md`).

**A real, non-obvious bug worth knowing before you touch this area again:**
`lock()` does **not** produce a distinct `LOCKED` status. It clears the
*active* wallet pointer, and WDK reports `NO_WALLET` — the identical raw
status to "no wallet was ever created." Trusting raw status alone after a
lock event would incorrectly send an existing user back through onboarding.
`useWdkSession.ts` disambiguates this using the *persisted* wallets list
(`useWalletManager().wallets`), which survives `lock()` clearing the active
pointer. If you ever rewrite this hook, preserve that disambiguation.

## Version pins — the short version

See `ENVIRONMENT.md` for the full table and reasoning. The one-line summary:
`wdk-react-native-core` must stay on `1.0.0-beta.10` (not caret-ranged) —
beta.12+ silently pulls SDK-56-only native modules that crash against this
app's SDK-55 build, with an error message that gives no hint it's a version
issue.

## What's covered vs. not, honestly

Built and verified end to end: wallet creation, import, balances, receive
address, a native BTC send path, lock/unlock, password protection, cloud
backup upload.

Not yet built: cloud backup *restore* (download + decrypt to recover a
wallet — `CloudBackupContext.downloadBackup()` exists and is ready, but no
screen calls it yet), and the multi-chain wallet screens beyond onboarding
haven't had the same integration-verification pass documented here.
