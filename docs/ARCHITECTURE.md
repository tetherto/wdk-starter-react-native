# Architecture

This document explains how the app is put together and, more importantly,
**why** — several structural decisions here exist specifically to avoid
problems this project hit during development. If you're going to deviate
from a pattern described here, read the reasoning first.

## The big picture (as it actually is today)

```
┌─────────────────────────────────────────────────────────────┐
│ Screens (src/app/**)                                          │
│   import DIRECTLY from '@/wdk/hooks/useWalletData',            │
│   '@/wdk/useSend', '@/wdk/indexer', '@/state/*' — see the       │
│   note below on why this differs from an earlier design         │
└───────────────────────┬───────────────────────────────────────┘
                         │
┌───────────────────────▼───────────────────────────────────────┐
│ WDK integration layer (src/wdk/**)                              │
│   hooks/useWalletData.ts — balances, accounts, transactions      │
│   useSend.ts — real sends (native + ERC-20 token transfers)       │
│   indexer.ts — WDK Indexer API (Activity tab)                      │
│   pricing.ts — CoinGecko (USD totals/fiat values)                   │
└───────────────────────┬───────────────────────────────────────────┘
                         │
┌───────────────────────▼───────────────────────────────────────────┐
│ WDK itself (Bare-runtime worklet)                                    │
│   @tetherto/wdk-react-native-core + @tetherto/wdk                     │
└───────────────────────────────────────────────────────────────────────┘
```

## A real correction: the "data seam" described in an earlier version of
## this doc is no longer how the app works — this isn't a stale detail,
## it's a structural drift worth understanding

An earlier phase of this project built a `src/data/` layer (`USE_WDK` flag,
`RepositoriesProvider`, `walletQueries.ts`) specifically so screens could be
built and tested against mock data before any real WDK integration existed,
without needing to touch screen code later to swap mocks for the real
thing.

**That layer still exists as files on disk, but it is dead code.** Checked
directly rather than assumed: zero screens under `src/app/` import from
`@/data` anymore; all of them (14 files, as of this writing) import
directly from `@/wdk/hooks/useWalletData` and friends. As the WDK
integration deepened — multi-network EVM support, real sends across native
and token assets, multi-account discovery, real transaction history via the
Indexer API — building each new piece directly against WDK's own hooks was
more direct than continuing to thread everything through an intermediate
seam that no longer had a second implementation (mock) actively
maintained behind it. The seam's original purpose (build UI without a
funded wallet) was genuinely useful during onboarding, but nothing since
has gone back through it.

**Recommendation, not yet acted on:** `src/data/` should be removed before
this PR merges, or in an immediate follow-up. Shipping it as-is means
carrying real, unused, misleading-if-read code — a reviewer or future
contributor finding `RepositoriesProvider` and `USE_WDK` would reasonably
assume it's load-bearing, when it isn't. This paragraph exists so that
assumption doesn't get made silently; the actual call on whether to delete
it now or track it as a follow-up ticket is a judgment call for whoever's
merging this.

## Why WDK integration is hook-based, not a repository

WDK's actual API (`useWalletManager`, `useAccount`, `useBalancesForWallet`,
`useWdkApp`) is a set of **React hooks**, not `Promise`-returning service
methods. An earlier design attempted to wrap WDK behind a plain repository
interface (matching the mock's shape exactly) — this fights WDK's own
design, since hooks can only be called from React components/hooks, not
arbitrary async functions.

The current design (`src/wdk/hooks/`) works *with* WDK's grain: hooks that
internally call WDK's hooks and reshape their output into the domain
models screens consume.

**A related, real constraint this caused, worth knowing before touching
`useSend.ts` or `wdk/indexer.ts`:** anywhere real, imperative logic is
needed outside a component's render (executing a send, batch-checking
several account indices for the multi-account discovery feature), WDK's
hook-only surface means that logic has to either (a) be structured as a
component that calls the hook and reports results via a callback (see
`AccountDiscoveryProbe.tsx`), or (b) resolve the account via a normal
hook call at the call site and pass the resolved object into a plain
function (see `useSend.ts`'s `sendAsset()`). Neither is a repository
pattern — both are deliberate accommodations to WDK's hook-based API, not
inconsistency.

## The WDK integration itself

See [`WDK_INTEGRATION.md`](WDK_INTEGRATION.md) for the full step-by-step
account, including exact package choices, the multi-network/multi-account/
transaction-history integrations, and the real, non-obvious bugs found and
fixed along the way.

## Wallet identity

`DEFAULT_WALLET_ID = 'primary'` (`src/wdk/walletIdentity.ts`) is a
**fixed constant** — every install of this app uses the same wallet ID.
This is a deliberate simplification for a single-wallet reference app, not
an oversight.

**Known consequence, not a bug:** because the ID is fixed, testing this app
repeatedly under the same Apple ID/Google account (reinstalling, resetting
simulators) will reuse the same cloud-backup storage slot each time — a new
backup overwrites the previous one. See `docs/CLOUD_BACKUP.md`.

## Multi-account architecture — a deliberate, real trade-off

This app supports switching between multiple accounts (BIP44-style
derivation indices) on the same wallet, but **which accounts exist, their
names, and which one is active are held entirely in memory** — nothing is
persisted to disk (`src/state/accounts.ts`). This wasn't the original
design; it replaced a version that persisted this via `expo-secure-store`,
after a real, confirmed bug: on iOS, Keychain-backed storage survives full
app deletion (documented Apple/Expo behavior), so deleting the app and
importing a *different* wallet still showed the *previous* wallet's
account list. Given the explicit direction to store only genuinely
sensitive data in Keychain and fetch everything else live, the account list
was made purely in-memory instead.

**The real trade-off this creates:** every fresh app launch starts with
just "Account 1." To make previously-used accounts reappear automatically
without persisting anything, `AccountDiscovery.tsx` checks a bounded range
of indices (currently 1 through 5, sequentially, with retries on failed
checks) for genuine on-chain activity on unlock, and surfaces any that have
real balances. This has a hard, structural limit: **an account with zero
balance and zero transaction history cannot be discovered this way** —
there is no signal to detect, since a seed phrase's derivation path carries
no information about which indices were ever actually used. The only way
to recover a genuinely zero-activity account's existence across a fresh
install would be storing that metadata somewhere that *does* survive
deletion — e.g., alongside the encrypted mnemonic in a cloud backup — which
is not currently implemented.

See `WDK_INTEGRATION.md` for the two real bugs found while building
discovery itself (a wrong readiness signal, and a stale-cache timing issue
in WDK's own balance hook) — both fixed, but worth reading if you touch
`AccountDiscovery.tsx`/`AccountDiscoveryProbe.tsx` again.

## Network identity — `src/wdk/networks.ts`

A single, small function (`networkDisplayName()`) is the one place that
decides how a network is SHOWN to a person, separate from its internal
config key. Every screen that displays a network name (Home, Receive,
Send, Activity, transaction detail) calls through this one function
rather than capitalizing the raw key itself — a real, confirmed bug
earlier had several screens each doing their own ad-hoc capitalization,
which is exactly how one screen was found to have missed a labeling fix
the others already had.

Bitcoin and Ethereum's labels are NOT hardcoded — they read from
`EXPO_PUBLIC_BTC_NETWORK_LABEL` / `EXPO_PUBLIC_EVM_ETHEREUM_NETWORK_LABEL`
at runtime (see `ENVIRONMENT.md`), since either can point at mainnet or a
testnet depending on `.env`. A hardcoded "(Sepolia)" would silently keep
showing that label even after someone repoints the provider to real
mainnet — exactly the kind of drift this function exists to prevent.
Arbitrum/Polygon stay fixed strings, since they're mainnet-only by
explicit team decision with no equivalent ambiguity to resolve.

**Why this is one env-configurable label, not two separate network
slots:** this app never runs both an Ethereum-mainnet AND an
Ethereum-Sepolia connection at the same time — at any moment, the
`ethereum` slot is pointed at exactly one of them. Splitting into two
independent, parallel network slots (the way Arbitrum and Polygon are
each their own slot) would mean touching `wdk.config.js`, `config.ts`,
`assets.ts`, the indexer mapping, and every screen that iterates over
networks — a real structural commitment, not a label fix, and one that's
much harder to walk back later than the smaller change actually made
here. If a future requirement genuinely needs both networks visible
simultaneously (not just "correctly labeled, one at a time"), that would
be the point to revisit this as a real second network slot — this
function's design doesn't preclude that later, it just doesn't
over-build for a need that doesn't exist yet.

This is also a first, deliberately small step toward the more general
"one place for chain identity" registry raised as follow-up work (not a
blocker) — this covers just the specific labeling bug reported; a fuller
registry unifying asset config/indexer mapping/icon lookup into one
structure is tracked separately, not attempted here.

## Distinguishing a failed fetch from a genuine zero balance

`TokenBalance` (`src/domain/models/index.ts`) has an optional
`fetchFailed` flag — real bug this exists to prevent: a per-asset balance
fetch that fails (an RPC timeout, a rate limit) returns `balance: null`,
and formatting `null` produces `"0"` — visually identical to a wallet
that's actually empty. `useWdkBalancesForAccount`
(`wdk/hooks/useWalletData.ts`) checks each row's own `success` field
explicitly rather than blindly formatting whatever balance comes back,
and Home's `TokenRow` shows a distinct, tappable-to-retry "Couldn't load"
state instead of a number when this flag is set.

This same distinction is what correctly caught a real, confirmed 429
rate-limit error from Bitcoin's provider that would otherwise have shown
as a plain, misleading `$0` — see `TROUBLESHOOTING.md`.

## Session / lock architecture

See [`SECURITY.md`](SECURITY.md) for the full password-vault and
lock/unlock design. The short version: three small, single-purpose Zustand
stores (`state/session.ts`, `state/passwordSession.ts`,
`state/lockSuppression.ts`) plus two always-mounted root components
(`AutoLockOnBackground`, `WdkSessionGate`) — deliberately kept separate
rather than one large auth context, since each piece independently caused a
real, distinct bug during development that was easier to isolate and fix
because they were separate.

**One more always-mounted root component since that was written:**
`AccountDiscovery` (see above) — mounted alongside the others, reacting to
`useWdkSession()`'s status specifically (not `useWalletManager().status`
directly — the two are genuinely different signals; see
`WDK_INTEGRATION.md` for why that distinction is load-bearing here).

## Responsive design system

Every screen scales with device size via `src/theme/responsive.ts`
(`useResponsive()` — `moderateScale`, `wp`, `hp`), anchored to the design
prototype's own canvas size (380×720 — not an arbitrary number, it's
literally the prototype HTML's own dimensions). Applied consistently
through `Text`, `Button`, `ScreenHeader`, `TextField`, and every screen
built since — new components should follow the same pattern rather than
hardcoding pixel values.

**A specific, recurring gotcha worth flagging explicitly:** small/bold text
at a fixed `fontSize` without an explicit `lineHeight` renders with visibly
clipped ascenders/descenders in this RN/Yoga setup, especially noticeable
at small sizes (this hit the Send Review screen's large amount text, and
Activity's tiny chain-badge letter, independently — same root cause both
times). Always pair an explicit `fontSize` with a deliberately generous
`lineHeight` (roughly 1.3–1.4x), not just the default.

## Shared icon rendering — `AssetIcon`

`src/components/AssetIcon.tsx` is the single source of truth for
token/chain icon rendering (Home, Receive, Send, Review all use it) —
consolidated after Home and Receive each independently built near-identical
icon logic. It handles two genuinely different real asset-logo styles
(some official brand assets are full "coin" icons with a color already
baked in — Bitcoin, Tether's USDT mark; others are just the mark on a
transparent background — Ethereum, Arbitrum, Polygon — needing a colored
circle behind them), and proportionally scales its chain-badge overlay to
whatever `size` is passed in, rather than a fixed pixel value that only
looked right at one specific size.

## Cloud backup architecture

See [`CLOUD_BACKUP.md`](CLOUD_BACKUP.md). One decision worth calling out
here: the person can choose **either** iCloud or Google Drive on **either**
platform — this required removing a `Platform.OS`-based gate that a
reference implementation this was adapted from used, and required
understanding that neither provider is actually platform-locked at a
technical level (CloudKit auth here is a WebView, not a native-iOS-only
API; Google Sign-In is genuinely cross-platform).

**Not yet built:** restore-from-cloud (download + decrypt to recover a
wallet on a fresh install). `CloudBackupContext.downloadBackup()` exists
and is ready; no screen calls it yet. This matters more than it might
sound like, given the multi-account trade-off above — a cloud restore
flow would be the natural place to also carry "how many accounts existed"
metadata that a plain seed-phrase re-import structurally cannot.
