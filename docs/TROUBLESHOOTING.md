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
