# Troubleshooting / Known Gotchas

A running list of real bugs hit during development, with root causes —
so they don't get rediscovered from scratch. If you hit something that
*looks* like one of these but isn't quite, check the exact error text
before assuming it's unrelated; several of these have misleading symptoms.

## Native build / environment

**Symptom:** `TurboModuleRegistry.getEnforcing('PlatformConstants')` crash,
or any generic-looking native crash on first build.
**Cause:** almost always npm < 11 (silently drops packages from git-dep
trees), JDK ≠ 17, or a stale global Expo CLI shadowing the local one. See
`ENVIRONMENT.md`. This is *not* usually a code bug.

**Symptom:** `NoClassDefFoundError: ...AnyTypeCache` at launch.
**Cause:** `wdk-react-native-core` caret-climbed past `beta.11` into
`beta.12+`, which pulls `expo-crypto@^56` into an SDK-55 app. Pin the exact
version — see `ENVIRONMENT.md`.

**Symptom:** `Crypto.getRandomValues must be defined`.
**Cause:** Hermes doesn't provide the Web Crypto API by default, and
`@tetherto/wdk-utils`' encryption (built on `@noble/*`) needs it. Fixed via
`react-native-get-random-values`, imported as the very first line of
`_layout.tsx` (`src/wdk/cryptoPolyfill.ts`). If this ever crashes again,
check that import is still first — order matters here.

**Symptom:** `npm ci` fails before installation even starts, with something
like:
```
Invalid: lock file's @noble/curves@1.9.7 does not satisfy @noble/curves@2.2.0
Invalid: lock file's @noble/hashes@1.8.0 does not satisfy @noble/hashes@2.2.0
```
**Cause — two layers, both real, and worth understanding separately:**

*Our own contribution to the ambiguity:* `@tetherto/wdk-wallet-btc`
depends on `@noble/hashes@^1.8.0`, while `@tetherto/wdk-utils` depends on
`@noble/hashes@^2.2.0` and `@noble/curves@^2.2.0` — both our own direct
dependencies, both still beta packages, so either can publish a new beta
under a version string that still satisfies our existing range.

*The deeper, actual root cause:* this specific failure mode — `npm ci`
rejecting a lockfile that `npm install` just generated — matches a real,
confirmed, longstanding npm CLI bug:
[npm/cli#8726](https://github.com/npm/cli/issues/8726), a regression open
since 2021 (v7.0.9), reported across npm 9.x, 10.x, and 11.x alike, still
unresolved. It happens specifically when a dependency's semver range
*could* resolve to more than one valid version — exactly the situation our
own `@noble/*` ranges create. This is genuinely not our bug to fix; it's
outside anything a project's own config can control.

An earlier version of this entry attributed this purely to "the lockfile
fell behind a beta republish" and stated it was confirmed fixed by
upgrading to npm 11.18.0 — that was an incomplete diagnosis. Given the
bug is reported across multiple npm majors, that specific version working
was very plausibly coincidental timing (no dependency happened to
republish between install and ci that time), not that version being
genuinely immune to npm/cli#8726. Correcting that here rather than leaving
an overstated claim standing.

**What to actually do about it:**
```bash
npm install      # NOT npm ci — this is the step that re-resolves
npm ci           # confirms the fix; usually passes after this
git add package-lock.json && git commit
```
This works often enough to be the practical first step, but per the npm
issue itself, "run install then ci" is explicitly called an insufficient
workaround, not a real fix — it can still fail intermittently depending on
timing. `npm >= 11.10.1` is required project-wide (see `ENVIRONMENT.md`)
as a practical baseline, not a version confirmed to eliminate this bug
entirely.

## Wallet lifecycle

**Symptom:** `"A wallet with the ID 'primary' already exists"` on a device
that was just freshly installed.
**Cause:** iOS Keychain survives app deletion (documented Apple behavior).
See `SECURITY.md` — this is self-healed in `importWallet()`, but if you see
it elsewhere, the fix is the same pattern (catch the specific error, call
`deleteWallet`, retry once).

**Symptom:** after finishing onboarding (password screen), the app briefly
shows the unlock screen instead of continuing to cloud-backup.
**Cause:** `WdkSessionGate` was reacting to *any* arrival at a locked-ish
status, including the transient one wallet creation itself passes through.
See `SECURITY.md` bug #2 — fixed by requiring the specific
`unlocked → locked` transition.

**Symptom:** backgrounding the app on iOS doesn't show the unlock screen on
return (works fine on Android).
**Cause:** iOS's `active → inactive → background` path vs. Android's direct
`active → background`. See `SECURITY.md` bug #3.

**Symptom:** signing into Google Drive during cloud backup pops the unlock
screen mid-flow, then eventually still completes the backup.
**Cause:** Google Sign-In's native Android picker Activity pauses the
app, registering as a false backgrounding signal. See `SECURITY.md` bug #4
— `lockSuppression.ts` exists for exactly this.

**Symptom:** typing a too-short password and leaving Confirm empty shows
no error at all — the length requirement only seems to "kick in" once
Confirm has something typed into it too.
**Cause:** the Continue button's `disabled` condition was `!password ||
!confirm` — fully disabling the button, and therefore never calling the
validation function at all, until BOTH fields had any text. Fixed by
gating only on `!password`, so the length check can run and show its
error immediately, without needing Confirm touched first.

## Cloud backup

**Symptom:** `RNGoogleSignin: failed to determine clientID —
GoogleService-Info.plist was not found and iosClientId was not provided`.
**Cause:** missing `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`, or it's set but the
app wasn't restarted with `npx expo start --clear` (env vars are inlined at
bundle time, not read live). See `CLOUD_BACKUP.md`.

**Symptom:** the above is fixed, but Google Sign-In on iOS still fails
silently with no useful error.
**Cause:** missing the `iosUrlScheme` config plugin registration in
`app.json` (the reversed client ID as a URL scheme) — required for the
OAuth redirect to route back into the app on iOS. Needs
`npx expo prebuild --clean` after adding it. See `CLOUD_BACKUP.md`.

**Symptom:** tapping iCloud opens Google Sign-In, or vice versa, seemingly
one step behind whatever was tapped.
**Cause:** `CloudBackupContext` methods reading `provider` from React state
that hadn't caught up yet. Fixed by threading `provider` as an explicit
argument everywhere. See `CLOUD_BACKUP.md`.

**Symptom:** a generic "Could not sign in with Google" / "Could not connect
to iCloud" error with no further detail, even when something more specific
actually failed.
**Cause:** the screen wasn't surfacing `CloudBackupContext`'s `lastError` —
just showing a hardcoded generic string regardless of what actually broke.
Fixed in `cloud-provider.tsx` to display `lastError` when available.

## Balances / multi-network / multi-account

**Symptom:** `"Batch of more than 3 requests are not allowed on free plan"`
from an RPC provider.
**Cause:** `drpc.org`'s free tier rejects any batch of more than 3 combined
JSON-RPC calls in one HTTP request. Making balance refetching more
aggressive (see the next entry) pushed a network with several assets over
this limit. Fixed for Ethereum/Sepolia by switching to
`ethereum-sepolia-rpc.publicnode.com` (verified as actively serving real
production traffic before switching) and for Arbitrum by switching to its
own official public RPC (`arb1.arbitrum.io/rpc`). **Polygon is still on
`drpc.org` as of this writing** — see `.env.example`'s note on this.

**Symptom:** a completed send doesn't update Home's balance for up to ~30
seconds, or a recipient account's balance stays stale even longer, only
correcting itself after a full app restart.
**Cause:** `useBalancesForWallet` defaults to a **30-second `staleTime`**
internally, confirmed directly in WDK's own source — a screen regaining
focus won't refetch if the existing data is still considered "fresh."
Fixed with `staleTime: 0` on this app's balance queries, `useFocusEffect`-
triggered refetches on Home/Accounts, and a short polling window
(`state/pendingRefresh.ts`) after a send completes specifically — since a
returned tx hash means *submitted*, not yet *mined*, a single refetch can
easily land before the chain has actually caught up.

**Symptom:** after import, discovered "extra" accounts with real balances
don't show up automatically — visible only via manually tapping "Add
account" enough times to reach the right index.
**Cause:** two real, separate bugs, both in `AccountDiscovery.tsx`/
`AccountDiscoveryProbe.tsx`:
  1. Originally watched `useWalletManager().status === 'UNLOCKED'`
     directly — the wrong readiness signal (see `WDK_INTEGRATION.md`'s
     Step 2 note). Fixed by switching to `useWdkSession()`.
  2. `useBalancesForWallet` passes `initialData` (a synchronous
     local-store lookup) into its underlying query, making `isLoading`
     false immediately — before any real fetch happens — and combined
     with the 30s `staleTime`, a never-before-checked account index's
     cached placeholder (empty) could be read as a confirmed result
     without a real network check ever occurring. Confirmed directly
     against real logs: every checked index reported a confident "empty"
     with zero corresponding real fetch ever appearing for it. Fixed by
     explicitly calling `refetch()` and gating on an *observed* fetch
     cycle (`isFetching` actually going `true` then `false`), not a
     point-in-time snapshot — a naive first attempt at this fix still had
     a timing gap, since `refetch()` doesn't synchronously flip
     `isFetching`.

**Symptom, still unresolved as of this writing:** after an extended
session, all EVM network balance fetches begin failing with `"Network
{chain} timed out after 15000ms"` — simultaneously, across networks on
*different* RPC providers, not just one. Quitting and relaunching the app
fixes it temporarily.
**Cause, confirmed directly in WDK's own source:** each EVM network's
`WalletAccountReadOnlyEvm` creates a **single, long-lived
`ethers.JsonRpcProvider` instance, once, reused for the lifetime of the
app** — never recreated or health-checked. This matches a well-documented
class of ethers.js/React Native issue where a long-lived JSON-RPC
connection can go stale after device network state changes (backgrounding,
WiFi/cellular handoff), with no built-in reconnection logic. All three EVM
networks failing together, despite different providers, points at this
shared connection-lifecycle pattern rather than any one provider's rate
limit. **The exact package responsible: `@tetherto/wdk-wallet-evm-7702-gasless`**
— this is where the fix needs to happen if reported upstream.
`@tetherto/wdk-react-native-core`'s `balanceService.ts` (visible in the
stack trace) only detects and logs the resulting timeout — it isn't where
the underlying issue lives, and isn't the package to file this against.
**This lives inside WDK's own package** — not fixable from this app's
code. The balance UI now distinguishes "fetch failed" from "genuinely
zero" (see `ARCHITECTURE.md`'s "Distinguishing a failed fetch from a
genuine zero balance" section) rather than showing `$0.00` for both — this
doesn't fix the underlying stale connection, but it stops the failure from
silently lying about the wallet's real balance.

**Symptom:** Bitcoin's balance shows a real `429 Too Many Requests — rate
limit exceeded` error from `tbtc1.trezor.io` (Blockbook), correctly
surfaced as "Couldn't load" rather than a misleading `$0`.
**Cause, confirmed directly from the error, not inferred:** a genuine
server-side rate limit — different from the EVM timeout entry above,
which has no clear signal at all. `staleTime: 0` (see
`WDK_INTEGRATION.md`) meant every focus event on every screen refetched
unconditionally, generating more request volume than this free, public
provider tolerates. Mitigated by raising `staleTime` to 15 seconds —
reduces the risk significantly but doesn't guarantee it never recurs,
since we don't control this provider's exact rate-limit threshold. A
dedicated, non-public Blockbook-compatible provider would be the more
durable long-term fix if this keeps recurring under real usage.

**Symptom:** clearing `EXPO_PUBLIC_BTC_NETWORK_LABEL` (or the Ethereum
equivalent) correctly updates the label on Home/Send, but Receive's
token/network dropdown still shows the old testnet label.
**Cause:** Receive's dropdown subtitle was a static lookup table with the
label hardcoded directly as a string (e.g. `'bitcoin-native': 'Bitcoin
(Testnet)'`) — completely bypassing `networkDisplayName()`, unlike every
other label on the same screen, which is why only this one spot didn't
update. Fixed by rebuilding it as a function that derives the label live,
the same way everything else on the screen already did. See
`ARCHITECTURE.md`'s "Network identity" section.

## Sending

**Symptom:** a failed send shows a raw, unhelpful blob like
`{"code":"UNKNOWN","message":"","error":""}` directly in the UI.
**Cause:** this specific "code: UNKNOWN, empty message" shape is a known,
common pattern for bundler/paymaster auth failures — many bundler
services deliberately return a generic, uninformative error for
invalid/missing API keys rather than confirming which, for security
reasons (an inference from the observed pattern, not confirmed against
Pimlico's own docs directly). The old error handling did
`e?.message ?? 'Transfer failed'` — but an empty string isn't
null/undefined, so `??` never fell through to a friendly message. Fixed
in `useSend.ts` by detecting this pattern specifically and replacing it
with an actionable message naming the exact env vars to check
(`EXPO_PUBLIC_EVM_{NETWORK}_BUNDLER_URL` / `_PAYMASTER_URL`).

**Symptom:** `"account.transfer is not a function (it is undefined)"` when
confirming a token (USDT/USDT0) send.
**Cause:** `.transfer()`/`.sendTransaction()` are chain-specific methods
that only exist on the object `useAccount()`'s own `.extension()` returns
— not on the hook's return value directly. `send`/`estimateFee` ARE
directly on the hook's return value (generic, cross-chain), which is why
Bitcoin's send path worked immediately while EVM token transfers didn't.
See `WDK_INTEGRATION.md`'s "Accounts and addresses" section.

**Symptom:** toggling an amount input between crypto and fiat display,
then back, silently changes the entered amount (e.g. typing `10`, toggling
twice with no other input, ends up showing something like `9.996438`).
**Cause:** each toggle was re-deriving and overwriting the underlying
amount from whatever was currently *displayed* — including an
intermediate value already rounded to 2 decimal places for the fiat view.
Round-tripping through that rounded intermediate silently lost precision.
Fixed by keeping one canonical, full-precision value (always in crypto
units) that only *typing* — never toggling — is allowed to change; toggling
only changes what's displayed, derived fresh from the canonical value each
time.

**Symptom:** deleting an amount field down to empty, or typing a
non-numeric character, crashes the screen.
**Cause:** `BigNumber`'s constructor **throws** on invalid input (empty
string, `"abc"`, a bare `"."`) rather than returning a gracefully-NaN
value — confirmed by testing directly, not assumed. An `.isNaN()` check
after construction never runs, since the exception happens on the
construction line itself. Fixed with a try/catch around construction, plus
input sanitization (stripping non-numeric characters as they're typed,
regardless of source — paste, physical keyboard, not just the on-screen
one) as a second layer.

**Symptom:** a genuinely-fixed-precision send amount displays with
unnecessary trailing zeros (`"1.000000 USDT"` instead of `"1 USDT"`), and
separately, the same hero amount text visually clips top/bottom even for
short values that don't need width-based shrinking at all.
**Cause:** two separate things. Trailing zeros: the underlying value is
correctly kept at full decimal precision for math, but was never
reformatted for *display* to drop insignificant trailing zeros — fixed
with a small `formatCryptoAmount()` utility. Clipping: same root cause as
the Activity chain-badge issue below — an explicit `fontSize` without a
sufficiently generous explicit `lineHeight`.

## Activity / transaction history

**Symptom:** every transaction shows as "just now" regardless of actual
age, and everything lands in an "Earlier" group instead of Today/
Yesterday.
**Cause:** the indexer's timestamps were assumed (and incorrectly
documented as "confirmed") to be Unix seconds, converted to milliseconds
by multiplying by 1000. They're already milliseconds — the extra
multiplication put every timestamp absurdly far in the future, making
`now - timestamp` deeply negative, which both bugs share as a root cause.
Fixed by removing the conversion. Worth noting: the original code comment
overstated confidence in an assumption that was never actually checked
against a live response — a good reminder to flag genuine uncertainty
rather than round it up.

**Symptom:** a real, human-confirmed $1 transfer displays as
`0.000001 USDT`.
**Cause:** off by exactly 10^6 — precisely USDT's own decimals value, too
exact to be coincidence. The indexer appears to return `amount` already as
a human-readable decimal string (not raw base units the way WDK's own
balance hooks do), and this integration was additionally applying its own
decimals shift on top — a double application. Fixed by removing the
extra shift for indexer-sourced amounts specifically (WDK's own balance
hooks, a different data source, correctly do need theirs — don't conflate
the two).

**Symptom:** selecting a chain filter (e.g. "Ethereum") still shows token
options that don't exist on that chain (e.g. "BTC").
**Cause:** the token filter's options were a static, hardcoded list,
completely independent of which chain was selected. Fixed by deriving
valid token options from the actual asset list, filtered by the currently-
selected chain — and resetting the token filter automatically if it
becomes invalid after a chain change, rather than silently keeping a dead
combination.

## UI

**Symptom:** a screen header's title/step label isn't centered — it's
pushed to one side.
**Cause:** `ScreenHeader` must always render exactly 3 layout slots (back,
middle, right) for `justify-content: space-between` to center the middle
one. A version that dropped to 2 slots when there was no `step`/`right`
content broke this. See `PROJECT_STRUCTURE.md`.

**Symptom:** an `Image` renders with unexpected empty padding around it, or
doesn't match its container's intended aspect ratio.
**Cause:** relying on the CSS `aspectRatio` style property to derive height
from width doesn't reliably resolve in this RN/Yoga setup. Compute both
`width` and `height` explicitly in JS instead.

**Symptom:** small/bold text (a large hero amount, a tiny chain-badge
letter) renders with its bottom visibly clipped, sitting high in its own
box.
**Cause:** an explicit `fontSize` without an explicit, sufficiently
generous `lineHeight` — the default doesn't reliably match the font's
actual rendered bounds in this RN/Yoga setup, especially noticeable at
small sizes. Hit independently on the Send Review screen's hero amount and
Activity's chain-badge letter — same root cause both times. Always pair a
deliberate `fontSize` with an explicit `lineHeight` (~1.3–1.4x), not the
default.

**Symptom:** a chain-badge icon overlay looks disconnected/undersized on a
larger icon (e.g. Review's larger hero icon vs. Home/Send/Receive's
smaller row icons), despite looking correct at the smaller size.
**Cause:** the badge's size and position offset were fixed pixel values,
tuned to look right only at the one size they were built against. Fixed
in `AssetIcon.tsx` by computing badge size/offset/border proportionally
from whatever `size` is actually passed in, rather than a flat constant.

**Symptom:** tapping a button (e.g. "Scan") on the Send Amount screen does
nothing on iOS, while the identical interaction works fine elsewhere.
**Cause:** NOT a touch-handling bug, despite looking like one — the
button's `onPress` was firing correctly the whole time. `Toast` (mounted
only at the app root) used React Native's own `<Modal>` at one point to
try to guarantee it rendered above the current screen — but `send`/
`receive` are presented as native `fullScreenModal`s via
`react-native-screens`, a *different* native presentation mechanism than
RN's own `Modal`, and the two don't reliably stack with each other. The
toast's state was updating correctly the whole time; it was presenting in
the wrong native layer, invisible behind the modal screen. Real fix:
mount an additional `<Toast/>` instance inside `send/_layout.tsx` and
`receive/_layout.tsx` themselves (same native presentation as those
screens), and revert `Toast.tsx` back to a plain `View` (not wrapped in
RN's `Modal`) — since multiple `Toast` instances share one Zustand store,
mounting several is safe, and avoids the separate real risk of multiple
simultaneous RN `Modal`s being open at once, which isn't reliably
well-defined.

**Symptom:** typing a word letter-by-letter into a recovery-phrase input
box scatters one letter per box across the grid.
**Cause:** an auto-advance-on-single-word condition that's true after
*every* keystroke (since "t", "th", "thi" are all "one word, no
whitespace"). Fixed by only advancing focus when the raw input has a
trailing space (a deliberate "done with this word" signal), never on
partial input. See `SeedWordInputGrid.tsx`'s own comments.

**Symptom:** on Android, an empty centered `TextInput`'s cursor appears
right-aligned until the first character is typed.
**Cause:** a known Android `TextInput` gravity-resolution quirk. Fixed by
setting `textAlignVertical: 'center'` alongside `textAlign: 'center'`
(Android-only property; harmless on iOS).

**Symptom:** a `TextField` is hidden behind the keyboard when focused.
**Cause:** should not happen — `Screen.tsx` wraps all content in
`KeyboardAvoidingView`. If you see this, check the screen isn't rendering
its own container instead of using `<Screen>`.

## Persistence / Keychain

**Symptom (Android):** after some time, the unlock screen rejects the
correct password, even freshly re-entered.
**Cause, well-documented, not fully confirmed as THE cause in this
specific case:** Android's Auto Backup can restore some app data
(files/SharedPreferences) from Google Drive on reinstall, but Android
Keystore-encrypted secrets are non-exportable and can't be properly
restored — a known "broken heart" failure mode for apps using
Keystore-backed encryption (which `expo-secure-store` is, on Android).
Expo's own docs state `expo-secure-store` should already protect against
this by default (`configureAndroidBackup` defaults to `true`) — mitigation
applied here was to make that config explicit in `app.json` rather than
rely on an unconfirmed default. See `ENVIRONMENT.md`.

**Symptom (iOS):** deleting the app entirely and importing a *different*
wallet still shows the *previous* wallet's account list (e.g. 8 accounts
from a wallet that was just deleted).
**Cause:** confirmed directly in Expo's own documentation — "data stored
with expo-secure-store will persist across app uninstallations when the
app is reinstalled with the same bundle ID... this is expected behavior of
the iOS Keychain system." The multi-account list was being persisted this
way. Fixed by making account list/name/active-index state purely
in-memory (see `ARCHITECTURE.md`'s "Multi-account architecture" section
for the trade-off this creates) — genuinely sensitive data (the password
vault, the wallet itself) correctly still uses Keychain; this was
specifically about non-sensitive UI-preference-like metadata that
shouldn't have been there in the first place.