# Architecture

This document explains how the app is put together and, more importantly,
**why** — several structural decisions here exist specifically to avoid
problems this project hit during development. If you're going to deviate
from a pattern described here, read the reasoning first.

## The big picture

```
┌─────────────────────────────────────────────────────────┐
│ Screens (src/app/**)                                     │
│   import from '@/data', '@/components', '@/theme' —      │
│   NEVER from '@/wdk' directly for data reads              │
└───────────────────────┬───────────────────────────────────┘
                         │
┌───────────────────────▼───────────────────────────────────┐
│ Data seam (src/data/**)                                    │
│   USE_WDK flag decides: mock repository, or WDK-backed      │
│   hooks. Screens never know which.                          │
└───────────────────────┬───────────────────────────────────┘
                         │
┌───────────────────────▼───────────────────────────────────┐
│ WDK integration layer (src/wdk/**)                          │
│   hooks/useWalletData.ts, useWalletActions.ts,               │
│   useWdkSession.ts — bridges WDK's hook-based API into       │
│   the shapes the data seam expects                           │
└───────────────────────┬───────────────────────────────────┘
                         │
┌───────────────────────▼───────────────────────────────────┐
│ WDK itself (Bare-runtime worklet)                            │
│   @tetherto/wdk-react-native-core + @tetherto/wdk             │
└─────────────────────────────────────────────────────────────┘
```

## Why a data seam exists at all

The app was deliberately built **without** WDK first — full navigation,
theming, and all screens working against a mock repository — before any
WDK integration began. The seam (`src/data/context/RepositoriesProvider.tsx`
+ `src/data/queries/*`) is what made swapping mock data for real WDK data
touch **zero screen code**: every screen calls `useAccounts()`,
`useBalances()`, `useTransactions()` from `@/data`, and a single flag
(`src/data/source.ts`'s `USE_WDK`) decides what's actually behind those
calls.

**Practical use:** flip `USE_WDK = false` to do UI/design work against
consistent, predictable mock data without needing a funded wallet or live
network calls. Flip it back to test against the real thing. See
`docs/TROUBLESHOOTING.md` if data hooks seem to ignore this flag.

## Why WDK integration is hook-based, not a repository

WDK's actual API (`useWalletManager`, `useAccount`, `useBalancesForWallet`,
`useWdkApp`) is a set of **React hooks**, not `Promise`-returning service
methods. An earlier design attempted to wrap WDK behind a plain repository
interface (matching the mock's shape exactly) — this fights WDK's own
design, since hooks can only be called from React components/hooks, not
arbitrary async functions.

The current design (`src/wdk/hooks/`) works *with* WDK's grain: it's a set
of hooks that internally call WDK's hooks and reshape their output into the
domain models the data seam expects. This is why `src/wdk/hooks/` exists as
its own layer between the data seam and WDK itself, rather than a
traditional repository class.

## The WDK integration itself

See [`WDK_INTEGRATION.md`](WDK_INTEGRATION.md) for the full step-by-step
account, including the exact package choices and why the alternative
integration path (`wdk-react-native-provider`) was rejected.

## Wallet identity

`DEFAULT_WALLET_ID = 'primary'` (`src/wdk/walletIdentity.ts`) is a
**fixed constant** — every install of this app uses the same wallet ID.
This is a deliberate simplification for a single-wallet reference app, not
an oversight, and it's the **one and only** place that would need to change
to support user-chosen wallet IDs / multiple wallets later. Every other
part of the WDK integration already keys off `activeWalletId` generically,
so this is a genuinely contained change.

**Known consequence, not a bug:** because the ID is fixed, testing this app
repeatedly under the same Apple ID/Google account (reinstalling, resetting
simulators) will reuse the same cloud-backup storage slot each time — a new
backup overwrites the previous one. See `docs/CLOUD_BACKUP.md`.

## Session / lock architecture

See [`SECURITY.md`](SECURITY.md) for the full password-vault and
lock/unlock design. The short version: three small, single-purpose Zustand
stores (`state/session.ts`, `state/passwordSession.ts`,
`state/lockSuppression.ts`) plus two always-mounted root components
(`AutoLockOnBackground`, `WdkSessionGate`) — deliberately kept separate
rather than one large auth context, since each piece independently caused a
real, distinct bug during development that was easier to isolate and fix
because they were separate.

## Responsive design system

Every screen scales with device size via `src/theme/responsive.ts`
(`useResponsive()` — `moderateScale`, `wp`, `hp`), anchored to the design
prototype's own canvas size (380×720 — not an arbitrary number, it's
literally the prototype HTML's own dimensions). Applied consistently
through `Text`, `Button`, `ScreenHeader`, `TextField`, and the seed-word
grid components — new components should follow the same pattern rather
than hardcoding pixel values. See the git history / PR discussion for the
specific bugs this caught (header centering math depending on exact
component slot counts, a wrong `aspectRatio`-based image-sizing approach
that doesn't reliably resolve on this RN/Yoga combination).

## Cloud backup architecture

See [`CLOUD_BACKUP.md`](CLOUD_BACKUP.md). One decision worth calling out
here: the person can choose **either** iCloud or Google Drive on **either**
platform — this required removing a `Platform.OS`-based gate that a
reference implementation this was adapted from used, and required
understanding that neither provider is actually platform-locked at a
technical level (CloudKit auth here is a WebView, not a native-iOS-only
API; Google Sign-In is genuinely cross-platform).
