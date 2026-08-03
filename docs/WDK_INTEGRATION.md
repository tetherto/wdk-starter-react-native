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
into the worklet. Currently: `bitcoin`, `spark` (required by the Bitcoin
package's own preload module), and `ethereum`/`arbitrum`/`polygon` (all
three via `@tetherto/wdk-wallet-evm-7702-gasless` — one package, three
network keys, since the worklet bundler doesn't care that they share an
implementation; only the *runtime* config in `wdk/config.ts` differs per
network). `tron` is deliberately absent — see "Networks currently in
scope" below.

The `postinstall` script (`wdk-worklet-bundler generate`) reads this
config and produces `.wdk-bundle/wdk-worklet.bundle.js` — gitignored,
regenerated on every install.

**The test for this step:** the app boots to your first screen with **no
crash**, before any screen calls a single WDK function.

## Step 2 — initialize the worklet runtime

`WdkAppProvider` (from `wdk-react-native-core`) wraps the app, given
`wdkConfigs` (`src/wdk/config.ts`) and the generated bundle. `useWdkApp()`
exposes the worklet's lifecycle status:
`INITIALIZING → NO_WALLET | LOCKED | READY | ERROR`.

**A real, non-obvious distinction that matters elsewhere in this app:**
`useWalletManager().status` (`'LOCKED' | 'UNLOCKED' | 'NO_WALLET' |
'LOADING' | 'ERROR'`) and `useWdkApp().state.status` (above) are **two
separate signals**, not the same thing spelled differently.
`useWalletManager().status` can report `'UNLOCKED'` before the broader
worklet/provider infrastructure has actually finished initializing —
confirmed the hard way while building account discovery (see below).
`useWdkSession.ts`'s wrapped status (used by `WdkSessionGate` and
`AccountDiscovery`) is built on `useWdkApp()`'s signal specifically,
because it only reaches "ready" once the whole system genuinely is.
If you're gating something on "is the app truly ready to make WDK calls,"
use `useWdkSession()`, not `useWalletManager().status` directly.

## Networks currently in scope

| Network | Package | Status |
|---|---|---|
| Bitcoin | `@tetherto/wdk-wallet-btc` | Testnet3 by default |
| Ethereum | `@tetherto/wdk-wallet-evm-7702-gasless` | **Sepolia testnet**, by team decision |
| Arbitrum | `@tetherto/wdk-wallet-evm-7702-gasless` | Real mainnet, by team decision |
| Polygon | `@tetherto/wdk-wallet-evm-7702-gasless` | Real mainnet, by team decision |
| Tron | `@tetherto/wdk-wallet-tron-gasfree` | **On hold** — gasfree.io is mid-migration to a new API version; not currently compiled into the worklet at all (see `wdk.config.js`) |

**Why Ethereum ≠ Arbitrum/Polygon's mainnet-vs-testnet choice:** the team
explicitly decided Ethereum Sepolia is the only EVM testnet needed (it's
the one network with a legitimate, verified testnet USDT available — see
below), while Arbitrum/Polygon are mainnet-only. Their testnets (Arbitrum
Sepolia, Polygon Amoy) were evaluated and explicitly ruled out per that
decision, not overlooked.

**⚠️ Arbitrum and Polygon involve real funds and real gas-sponsorship
costs.** Unlike Sepolia, EIP-7702 sponsorship on these two draws on your
bundler provider's real balance the moment a transaction is sent. This is
intentional, per the team's own direction — flagged here so it isn't
missed while working in this codebase.

### Test token provenance (a real, non-obvious verification chain)

- **Ethereum (Sepolia) USDT**: `0xd077A400968890Eacc75cdc901F0356c943e4fDb` —
  confirmed via Candide's own official docs
  (`docs.candide.dev/wallet/paymaster/tokens-supported`), **not** Aave's
  Sepolia test USDT (`0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0`), which
  is a *different* contract. This matters concretely: testing the
  sponsored-gas flow through Candide's paymaster specifically requires a
  token Candide's own infrastructure recognizes — Aave's otherwise-
  legitimate test token isn't guaranteed to work there. Get this one from
  Candide's own dashboard faucet, not Aave's.
- **Arbitrum/Polygon USDT(0)**: real mainnet contracts (verified directly
  against Arbiscan/Polygonscan) — see `src/wdk/assets.ts`'s own comments
  for the verification details, including why Arbitrum's is genuinely
  named "USDT0" on-chain (a different, newer cross-chain token standard),
  not just USDT under a different name.

## Steps 3–5 — real data, sending, wallet lifecycle

Built against WDK's **real, version-verified hook API**, not assumptions
carried over from a different SDK style or from one network's behavior
generalized to all of them.

### Balances

`useBalancesForWallet(accountIndex, assets[], opts)` — a *batch* call
across assets, not one hook per asset. Real, non-obvious details:

- Defaults to a **30-second `staleTime`** internally
  (`DEFAULT_QUERY_STALE_TIME_MS`) — confirmed directly in WDK's own
  source. Left at the default, a screen regaining focus (returning from a
  send, switching accounts) won't refetch even though the underlying
  balance has genuinely changed, since React Query considers the existing
  data "still fresh." This app passes `staleTime: 15_000` (raised from an
  earlier `0` after a real, confirmed 429 "rate limit exceeded" error from
  Bitcoin's Blockbook provider — `staleTime: 0` meant every focus event,
  on every screen, refetched unconditionally, which was more request
  volume than that free, public provider tolerates. 15s still avoids the
  original stale-balance complaint, which was about a 30-second wait, not
  a 15-second one, while meaningfully cutting redundant refetch volume),
  combined with `useFocusEffect`-triggered refetches on Home and
  Accounts.
- Passes `initialData` internally — a synchronous local-store lookup, not
  a live fetch. This makes `isLoading` become `false` immediately on
  mount, even before any real network check has happened. For an index
  that's *never* been queried before (relevant specifically to
  `AccountDiscoveryProbe.tsx`, which checks fresh, never-before-seen
  indices), that cached placeholder defaults to empty — and `isLoading`
  alone can't distinguish "no real data yet" from "confirmed genuinely
  empty." The fix used here: explicitly call `refetch()` and gate on
  `isFetching` actually cycling `false → true → false` (a real,
  *observed* fetch), not just checking `isLoading` or a single
  point-in-time `isFetching` snapshot (calling `refetch()` doesn't
  synchronously flip `isFetching` — that update lands on a later render,
  so checking immediately after triggering a refetch can see a stale
  pre-kickoff value and report prematurely, reintroducing the same bug via
  a timing gap).

### Accounts and addresses

`useAccount({ network, accountIndex })` returns `{ address, isLoading,
error, account, getBalance, send, sign, verify, estimateFee, extension }`
— confirmed directly against the hook's real return shape, not assumed.
**`send` and `estimateFee` are generic, cross-chain methods** — they work
for *any native* asset uniformly, both taking `{ to, asset, amount }`.
Bitcoin is currently this app's only native asset (native ETH was removed
— see the "Networks currently in scope" note below on why — so this
generic path only has one concrete example in the app today, though the
mechanism itself isn't Bitcoin-specific). **`.transfer()` and
`.sendTransaction()` are chain-specific and only exist on whatever
`.extension()` returns** — calling them directly on the hook's own return
value throws `"...is not a function"`. This was a real, shipped bug here
before being caught and fixed (see `TROUBLESHOOTING.md`).

So sending in this app is really just two paths, not three:
- **Native** (currently just BTC): `account.send({ to, asset, amount })` — generic.
- **Token** (USDT/USDT0): `account.extension().transfer({ token,
  recipient, amount })`.

### Fees

For this app's EVM config (`isSponsored: true`), the fee is **genuinely,
verifiably zero** — confirmed directly in `wdk-wallet-evm-7702-gasless`'s
own source: fee defaults to a literal `0n`, only recalculated `if
(!isSponsored)`. `useSend.ts`'s fee-quoting short-circuits to `{fee: '0',
isSponsored: true}` for any non-Bitcoin asset without an SDK call, rather
than estimating something already known to be zero. Bitcoin (no
sponsorship) uses the same generic `estimateFee({ to, asset, amount })`
`send` itself uses — not a Bitcoin-specific quote method.

### Multi-account

See `ARCHITECTURE.md`'s "Multi-account architecture" section for the full
design and its real, stated trade-off (in-memory only, no persistence).
`AccountDiscovery.tsx` + `AccountDiscoveryProbe.tsx` are the mechanism —
two real bugs were found and fixed building this, both worth knowing if
you touch this code:

1. **Wrong readiness signal.** Originally watched
   `useWalletManager().status === 'UNLOCKED'` directly — see the Step 2
   note above for why that's the wrong signal; switched to
   `useWdkSession()`.
2. **The `initialData`/`isFetching` issue described under "Balances"
   above** — this is *why* that issue was found in the first place:
   discovery checking never-before-seen account indices is exactly the
   scenario where WDK's cached placeholder looks identical to a genuinely
   empty result.

### Transaction history (Activity tab)

Via `@tetherto/wdk-indexer-http` (`WdkIndexerClient`) — **not yet on the
public npm registry** (confirmed directly; `npm view` returns "Not
Found"), same situation as `wdk-worklet-bundler` — installed via a pinned
GitHub commit reference in `package.json`, not a version string. Requires
a real, registered API key (`EXPO_PUBLIC_WDK_INDEXER_API_KEY` — see
`.env.example`); nothing in Activity works without one.

Two real, structural API limitations, not gaps in this integration:

- **No native ETH history support at all** was the actual reason native
  ETH is no longer an asset in this app in the first place. The indexer's
  own `Token` type is exactly `"usdt" | "xaut" | "btc"` — there's no
  `"eth"`. Someone depositing ETH would see their balance update but their
  transaction never appear in Activity, which reads as a real bug rather
  than an API limitation — so rather than ship an asset whose history
  could never work, it was removed from `wdk/assets.ts` entirely. If a
  future indexer version adds ETH support, this can be reintroduced.
- **`"sepolia"` is a distinct `Blockchain` value from `"ethereum"`** in
  this API's own type system — since this app's `ethereum` network
  actually points at Sepolia (see the network table above), querying
  transaction history for it correctly uses `'sepolia'`, mapped in
  `src/wdk/indexer.ts`. This mapping would need updating if `ethereum`
  is ever repointed to real mainnet.

Direction (`sent`/`received`) isn't returned by the API — it's derived by
comparing each transfer's raw `from`/`to` against the account's own
address on that transfer's network.

**A real bug worth flagging if you touch timestamp handling:** an earlier
version of this integration assumed (and incorrectly stated as
"confirmed") that the indexer's timestamps were Unix seconds, converting
to milliseconds by multiplying by 1000. They're already milliseconds —
the multiplication made every timestamp land absurdly far in the future,
which silently manifested as every transaction showing "just now"
regardless of actual age, and every transaction landing in an "Earlier"
group instead of Today/Yesterday. Fixed by removing the conversion
entirely. Worth stating plainly: this was an assumption dressed up as a
verified fact in the original code comment, not something actually
checked against a live response at the time — a good reminder to flag
genuine uncertainty rather than round it up to "confirmed."

### Wallet lifecycle

`generateMnemonic`, `restoreWallet`, `unlock`, `lock`, `getMnemonic`,
`deleteWallet`, `getSeedAndEntropyFromMnemonic` (used for cloud backup —
see `CLOUD_BACKUP.md`).

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
issue. `@tetherto/wdk-indexer-http` is pinned to a specific GitHub commit
(no tagged releases exist yet) for the same class of reason.

## What's covered vs. not, honestly

Built and verified end to end, against real WDK/real external services (not
mocked): wallet creation, import, multi-network balances (BTC/USDT
across Bitcoin/Ethereum/Arbitrum/Polygon — native ETH intentionally not
included, see the Indexer API limitation above), multi-account switching and
bounded automatic discovery, receive addresses + QR, a full send flow
(pick token → amount → review → confirm → success) covering both native
and ERC-20 token transfers, real transaction history via the Indexer API,
lock/unlock, password protection, cloud backup upload.

Not yet built: cloud backup *restore* (download + decrypt to recover a
wallet — `CloudBackupContext.downloadBackup()` exists and is ready, but no
screen calls it yet), Tron/GasFree (on hold, see the network table above),
and a known, unresolved WDK-level issue where long-lived EVM RPC
connections can begin timing out after an extended session (see
`TROUBLESHOOTING.md`'s last entry) — this is inside WDK's own provider
management, not something fixable from this app's code, and hasn't been
reported upstream yet as of this writing.
