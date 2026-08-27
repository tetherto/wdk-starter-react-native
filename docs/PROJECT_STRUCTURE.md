# Project Structure

```
src/
├── app/                            # Expo Router — file-based routing
│   ├── _layout.tsx                  # Root: WdkAppProvider, ThemeProvider,
│   │                                 # CloudBackupProvider, GestureHandlerRootView,
│   │                                 # SafeAreaProvider, AutoLockOnBackground,
│   │                                 # AccountDiscovery, WdkSessionGate, Toast
│   ├── index.tsx                    # Entry gate — routes based on session status
│   ├── unlock.tsx                   # App-password unlock screen
│   ├── (onboarding)/
│   │   ├── welcome.tsx               # Create/import only — no "unlock" option here;
│   │   │                              # this screen only ever renders when no wallet
│   │   │                              # exists, so unlocking one is never applicable
│   │   ├── seed-hidden.tsx           # Recovery phrase — masked, 12/24 toggle
│   │   ├── seed-revealed.tsx         # Recovery phrase — revealed, copy-to-clipboard
│   │   ├── import.tsx                # Import an existing phrase, 12/24 words
│   │   ├── password.tsx              # Create app password; commits the wallet
│   │   ├── cloud-backup.tsx          # Cloud backup offer/intro screen
│   │   ├── cloud-provider.tsx        # Choose iCloud or Google Drive; runs the
│   │   │                              # real backup end to end
│   │   └── cloud-backup-success.tsx
│   ├── (app)/(tabs)/
│   │   ├── wallet.tsx                # Home — balances, total USD, quick actions
│   │   └── activity.tsx              # Transaction history — real Indexer API data
│   ├── accounts/
│   │   ├── _layout.tsx
│   │   └── index.tsx                 # Account list, search, add account
│   ├── receive/
│   │   ├── _layout.tsx               # Mounts its own <Toast/> — see the note below
│   │   └── index.tsx                 # Network/token picker, QR, copy/share
│   ├── send/
│   │   ├── _layout.tsx               # Also mounts its own <Toast/> — same reason
│   │   ├── index.tsx                 # Pick a token to send
│   │   ├── amount.tsx                # Recipient + amount, crypto/fiat toggle
│   │   ├── review.tsx                # Confirm — executes a REAL send
│   │   └── success.tsx               # Real tx hash, links to a real explorer
│   └── tx/
│       ├── _layout.tsx
│       └── [id].tsx                  # Transaction detail (looked up from the same
│                                       # list Activity already loaded, not a
│                                       # separate fetch — the indexer has no
│                                       # single-transfer-by-hash endpoint)
│
├── components/                      # Shared, reusable UI primitives
│   ├── Screen.tsx                    # Themed container, KeyboardAvoidingView,
│   │                                  # nested SafeAreaProvider (see the note below)
│   ├── ScreenHeader.tsx              # Back button + title/step — always 3 slots
│   ├── Text.tsx                      # ALL text renders through this
│   ├── Button.tsx / TextField.tsx / Pill.tsx / Card.tsx
│   ├── AssetIcon.tsx                 # Shared token/chain icon — see ARCHITECTURE.md
│   ├── Toast.tsx                     # Bottom pill notification (not a native Alert) —
│   │                                  # mounted at root AND inside send/receive's own
│   │                                  # nested layouts (see the note below)
│   ├── SeedWordGrid.tsx              # Read-only word grid
│   ├── SeedWordInputGrid.tsx         # Editable word grid, paste-distribution
│   ├── StateViews.tsx                # LoadingState / EmptyState / ErrorState
│   └── index.ts                      # Barrel export — add new components here
│
├── theme/
│   ├── responsive.ts                 # useResponsive() — the scaling system
│   ├── tokens.ts                     # Typography variants
│   ├── palettes.ts                   # Colors, light/dark
│   └── assetIcons.ts                 # Static require() map for chain/token logos
│                                       # (Metro needs static, analyzable requires —
│                                       # no dynamic path building)
│
├── state/                            # Small, single-purpose Zustand stores
│   ├── session.ts                    # App session status
│   ├── passwordSession.ts            # In-memory-ONLY password for the current
│   │                                  # unlocked session (never persisted)
│   ├── lockSuppression.ts            # Suppresses auto-lock during known
│   │                                  # legitimate foreground handoffs
│   ├── accounts.ts                   # Multi-account state — DELIBERATELY NOT
│   │                                  # persisted to disk. See ARCHITECTURE.md's
│   │                                  # "Multi-account architecture" section for
│   │                                  # why (a real bug this replaced) and the
│   │                                  # real trade-off it accepts.
│   ├── pendingRefresh.ts             # Short-lived flag: "a send just completed,
│   │                                  # keep polling balances for ~30s" — since a
│   │                                  # tx hash means submitted, not yet mined
│   └── toast.ts                      # Global toast message state
│
├── domain/models/                    # Framework-free types screens consume
│                                       # (Token, TokenBalance, Account, Transaction)
│
└── wdk/                              # WDK integration layer
    ├── config.ts                      # Shim — re-exports wdkConfigs from
    │                                    # networks.ts, nothing to edit here
    ├── networks.ts                    # Single source of truth for every
    │                                    # per-network fact (display, EVM/BTC
    │                                    # runtime config, assets, indexer
    │                                    # mapping, icons, explorer links) —
    │                                    # see ARCHITECTURE.md's "Network
    │                                    # identity" section
    ├── chains.ts                      # Shim — re-exports networkDisplayName,
    │                                    # ALL_NETWORKS, NetworkId, etc. from
    │                                    # networks.ts, nothing to edit here
    ├── assets.ts / AppAsset.ts        # assets.ts is a shim re-exporting the
    │                                    # asset list from networks.ts;
    │                                    # AppAsset.ts is the real class — see
    │                                    # its own header comments for
    │                                    # verified contract addresses and
    │                                    # the Arbitrum "USDT0" naming note
    ├── walletIdentity.ts              # DEFAULT_WALLET_ID — see ARCHITECTURE.md
    ├── passwordVault.ts               # Envelope-encrypted app password — see SECURITY.md
    ├── cloudBackupEncryption.ts       # wdk-utils wrapper for the backup payload
    ├── cryptoPolyfill.ts              # react-native-get-random-values import
    │                                    # (must be the first import in _layout.tsx)
    ├── pricing.ts                     # CoinGecko client — powers real USD totals
    ├── useSend.ts                     # Real send execution + fee quoting — see
    │                                    # WDK_INTEGRATION.md's "Sending" section
    ├── indexer.ts                     # WDK Indexer API client — see
    │                                    # WDK_INTEGRATION.md's transaction-history section
    ├── hooks/
    │   ├── useWalletData.ts            # useWdkBalances / useWdkAccount /
    │   │                                  # useWdkTransactions — the main
    │   │                                  # data surface screens import
    │   ├── useWalletActions.ts         # generateSeed/importWallet/unlock/lock/getMnemonic
    │   ├── useWdkSession.ts            # Maps WDK's raw lifecycle -> app session status
    │   ├── AutoLockOnBackground.tsx    # Locks on real backgrounding — see SECURITY.md
    │   ├── WdkSessionGate.tsx          # Redirects to /unlock on a genuine lock event
    │   ├── AccountDiscovery.tsx        # Bounded on-chain account discovery on unlock
    │   └── AccountDiscoveryProbe.tsx   # One-index balance probe used by the above
    └── cloud-backup/
        ├── CloudBackupContext.tsx      # The engine — see CLOUD_BACKUP.md
        ├── CloudKitAuthWebView.tsx      # Apple ID web sign-in (WebView, cross-platform)
        └── cloudkitAuthHtml.ts          # CloudKit JS page, inlined (not a static
                                          # asset — see the file's own comments for why)
```

## A dead layer worth knowing about, not just ignoring

`src/data/` (mock repository, `RepositoriesProvider`, `USE_WDK` flag) still
exists as files but is imported by **zero** screens — confirmed directly,
not assumed. See `ARCHITECTURE.md`'s note on this for the full context and
a recommendation to remove it before/shortly after this PR merges.

## Naming/organization conventions worth following

- **Screens call `@/wdk/hooks/useWalletData`'s hooks directly** — the
  `@/data` seam described in an earlier version of this doc is dead code
  (see above); don't route new work through it.
- **One component, one responsibility.** `SeedWordGrid` (read-only) and
  `SeedWordInputGrid` (editable) are deliberately separate — genuinely
  different interaction models, not one component with a `readOnly` prop.
- **`ScreenHeader` always renders exactly 3 layout slots** (back, middle,
  right — even when some are empty spacers) — required for
  `justify-content: space-between` to center the middle slot correctly.
- **Every screen with a `TextField` needs no special keyboard handling** —
  `Screen.tsx`'s `KeyboardAvoidingView` wrapper handles it globally.
- **`Screen.tsx` wraps its `SafeAreaView` in its own `SafeAreaProvider`.**
  Real fix, not decoration: screens presented as a native `fullScreenModal`
  (`send`, `receive`) don't reliably inherit safe-area insets from the
  app-level provider on iOS — this re-establishes correct insets regardless
  of how a screen was presented.
- **`Toast` is mounted in more than one place, deliberately.** Once at the
  app root, and again inside `send/_layout.tsx` and `receive/_layout.tsx`.
  Those two screens are presented as native `fullScreenModal`s — a genuinely
  separate native view hierarchy from the root on iOS — so a toast
  triggered while one is open was silently invisible under it, even though
  its state was updating correctly underneath. Multiple mounted instances
  of the same shared-store-backed component is safe and intentional here,
  not redundant.
- **`AssetIcon` is the one place token/chain icon logic lives.** Don't
  rebuild icon+badge rendering per-screen — Home and Receive each did that
  independently before this consolidation, and it's exactly the kind of
  thing that drifts out of sync (see `ARCHITECTURE.md`).
