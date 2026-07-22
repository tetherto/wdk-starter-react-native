# Project Structure

```
src/
├── app/                          # Expo Router — file-based routing
│   ├── _layout.tsx                # Root: WdkAppProvider, ThemeProvider,
│   │                               # RepositoriesProvider, CloudBackupProvider,
│   │                               # AutoLockOnBackground, WdkSessionGate
│   ├── index.tsx                  # Entry gate — routes based on session status
│   ├── unlock.tsx                 # App-password unlock screen
│   ├── (onboarding)/
│   │   ├── welcome.tsx
│   │   ├── seed-hidden.tsx         # Recovery phrase — masked, 12/24 toggle
│   │   ├── seed-revealed.tsx       # Recovery phrase — revealed, copy-to-clipboard
│   │   ├── import.tsx              # Import an existing phrase, 12/24 words
│   │   ├── password.tsx            # Create app password; commits the wallet
│   │   ├── cloud-backup.tsx        # Cloud backup offer/intro screen
│   │   ├── cloud-provider.tsx      # Choose iCloud or Google Drive; runs the
│   │   │                            # real backup end to end
│   │   └── cloud-backup-success.tsx
│   └── (app)/                     # Post-onboarding app shell (tabs, etc.)
│
├── components/                    # Shared, reusable UI primitives
│   ├── Screen.tsx                  # Themed container + KeyboardAvoidingView
│   ├── ScreenHeader.tsx            # Back button + title/step — see note below
│   ├── Text.tsx                    # ALL text renders through this — applies
│   │                                # responsive font scaling automatically
│   ├── Button.tsx
│   ├── TextField.tsx
│   ├── Pill.tsx
│   ├── SeedWordGrid.tsx            # Read-only word grid (seed-hidden/revealed)
│   ├── SeedWordInputGrid.tsx       # Editable word grid (import), with
│   │                                # paste-distribution across boxes
│   └── index.ts                    # Barrel export — add new components here
│
├── theme/
│   ├── responsive.ts               # useResponsive() — the scaling system
│   ├── tokens.ts                   # Typography variants (fontSize/weight/lineHeight)
│   └── palettes.ts                 # Colors, light/dark
│
├── state/                          # Small, single-purpose Zustand stores
│   ├── session.ts                  # App session status (loading/noWallet/locked/unlocked)
│   ├── passwordSession.ts          # In-memory-ONLY password for the current
│   │                                # unlocked session (never persisted)
│   └── lockSuppression.ts          # Suppresses auto-lock during known
│                                     # legitimate foreground handoffs (e.g.
│                                     # Google Sign-In's native picker)
│
├── data/                           # The mock/WDK seam — see ARCHITECTURE.md
│   ├── source.ts                    # USE_WDK flag
│   ├── context/RepositoriesProvider.tsx
│   ├── queries/walletQueries.ts     # useAccounts/useBalances/useTransactions —
│   │                                 # what every screen actually imports
│   └── mock/mockWalletRepository.ts
│
└── wdk/                            # WDK integration layer
    ├── config.ts                    # wdkConfigs — networks compiled into the worklet
    ├── walletIdentity.ts            # DEFAULT_WALLET_ID — see ARCHITECTURE.md
    ├── assets.ts / AppAsset.ts       # Asset registry
    ├── passwordVault.ts              # Envelope-encrypted app password — see SECURITY.md
    ├── cloudBackupEncryption.ts       # wdk-utils wrapper for the backup payload
    ├── cryptoPolyfill.ts              # react-native-get-random-values import
    │                                   # (must be the first import in _layout.tsx)
    ├── hooks/
    │   ├── useWalletData.ts           # useWdkBalances/useWdkAccount/useWdkTransactions
    │   │                                + networkColor map
    │   ├── useWalletActions.ts        # generateSeed/importWallet/unlock/lock/getMnemonic
    │   ├── useWdkSession.ts           # Maps WDK's raw lifecycle -> app session status
    │   ├── AutoLockOnBackground.tsx   # Locks on real backgrounding — see SECURITY.md
    │   └── WdkSessionGate.tsx         # Redirects to /unlock on a genuine lock event
    └── cloud-backup/
        ├── CloudBackupContext.tsx      # The engine — see CLOUD_BACKUP.md
        ├── CloudKitAuthWebView.tsx      # Apple ID web sign-in (WebView, cross-platform)
        └── cloudkitAuthHtml.ts          # CloudKit JS page, inlined (not a static
                                          # asset — see the file's own comments for why)
```

## Naming/organization conventions worth following

- **Screens never import WDK directly for data reads.** Always go through
  `@/data`'s hooks. If you're writing a new data-driven screen and reaching
  for `useWalletManager()` yourself, stop and check whether the data seam
  already covers it, or should be extended to.
- **One component, one responsibility.** `SeedWordGrid` (read-only) and
  `SeedWordInputGrid` (editable) are deliberately separate components, not
  one component with a `readOnly` prop — they have genuinely different
  interaction models (display vs. paste-handling/focus-advance), and
  keeping them separate made both easier to get right and to fix
  independently when bugs showed up in one but not the other.
- **`ScreenHeader` always renders exactly 3 layout slots** (back, middle,
  right — even when some are empty spacers). This isn't arbitrary: with
  `justify-content: space-between`, 3 equal-outer-width slots is what makes
  the middle one land dead center. A version of this component that
  dropped to 2 slots when there was no `step`/`right` content broke
  centering — see `TROUBLESHOOTING.md`.
- **Every screen with a `TextField` needs no special handling for the
  keyboard** — `Screen.tsx`'s `KeyboardAvoidingView` wrapper handles it
  globally. Don't add per-screen keyboard-avoidance logic.
