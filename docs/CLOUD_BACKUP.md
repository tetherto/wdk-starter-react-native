# Cloud Backup

Lets a person back up an encrypted copy of their recovery phrase to a
cloud provider, and (once the restore screen is built — see the note at
the bottom) recover it on another device.

This guide is adapted from the WDK showcase app's own cloud-backup setup
guide, with the differences called out explicitly wherever this app does
something different. If you've set up cloud backup for the showcase
before, read the **"How this app differs from the showcase"** section
first — several steps are genuinely different here, not just renamed.

---

## How this app differs from the showcase

The showcase hard-gates by platform: iOS gets CloudKit only, Android gets
Google Drive only, and the person never chooses. **This app lets the
person choose either provider on either platform.** Neither provider is
actually platform-locked at a technical level:

- CloudKit access here goes through a `WebView` running CloudKit JS with a
  **web-based** Apple ID sign-in — not a native-iOS-only API. It works
  identically on Android.
- Google Sign-In (`@react-native-google-signin/google-signin`) is
  genuinely cross-platform.

Two concrete consequences of this choice, both of which are **extra setup
steps the showcase's guide doesn't have**, because it never needed them:

1. **Google Sign-In needs an iOS OAuth client too** (Section 3 below) —
   the showcase only ever runs Google Sign-In on Android.
2. **The encryption passphrase is the person's own app password, not a
   fixed one.** The showcase encrypts every backup with a single
   `.env`-configured passphrase shared by every install of the app —
   explicitly documented in that codebase as a demo-only shortcut, not
   something to do in production. This app instead recovers the person's
   real app password (`passwordVault.getAppPassword()`, see
   `SECURITY.md`) and encrypts with that. There is **no**
   `EXPO_PUBLIC_CLOUD_BACKUP_PASSPHRASE` variable in this app — if you're
   used to the showcase, don't go looking for it.

One more small difference: the CloudKit callback URL is an `.env` variable
here (`EXPO_PUBLIC_CLOUDKIT_CALLBACK_URL`), not a hardcoded JS constant
like the showcase — so forking this starter for your own app doesn't
require editing source code for this, just your `.env`.

---

## Security model

```
Wallet mnemonic (WDK secure storage)
  ↓
getSeedAndEntropyFromMnemonic()     WDK's own crypto: { encryptionKey, encryptedEntropyBuffer }
  ↓
JSON.stringify(...)                  combine into one payload string
  ↓
encryptPayload(payload, appPassword) AES-256-GCM + scrypt, keyed to the PERSON'S password
  ↓
JSON.stringify(encryptedPayload)     serialize for cloud storage
  ↓
uploadBackup(payload, walletId)      stored under a wallet-specific record/file
```

The cloud only ever stores encrypted data. Restoring requires **all** of:
the encrypted backup, the person's app password, and the WDK worklet
(for `getMnemonicFromEntropy`). Without all three, the backup cannot be
decrypted — including by anyone who only has a copy of this app's source
code, since the passphrase isn't baked into the app.

**Per-wallet storage:** each wallet's backup is stored under a name derived
from its wallet ID:
- iOS CloudKit: `recordName = "wallet_<base64(walletId)>"`
- Google Drive: `fileName = "wallet_<base64(walletId)>.json"`

This app uses a **fixed** wallet ID (`'primary'` — see `ARCHITECTURE.md`),
so every install computes the same record name. Testing repeatedly under
your own Apple ID/Google account will overwrite the same backup slot each
time — expected, not a bug.

---

## Required `.env` variables

```bash
# iOS — CloudKit
EXPO_PUBLIC_CLOUDKIT_CONTAINER_ID=iCloud.io.tether.wdkstarterreactnative
EXPO_PUBLIC_CLOUDKIT_API_TOKEN=
EXPO_PUBLIC_CLOUDKIT_CALLBACK_URL=

# Google Drive — BOTH platforms
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=
```

The app runs fine with none of these set — you just can't test cloud
backup until they're filled in. There is deliberately **no** payload
passphrase variable — see above.

---

## 1. iOS Cloud Backup Setup (Apple CloudKit)

### Step 1 — Apple Developer Portal: create the App ID and iCloud container

1. Go to [developer.apple.com](https://developer.apple.com) →
   **Certificates, Identifiers & Profiles**
2. **Identifiers** → **+**
3. **App IDs** → **App** → Continue
4. Description: `WDK Starter Wallet`, Bundle ID: `io.tether.wdkstarterreactnative`
   (must exactly match `expo.ios.bundleIdentifier` in `app.json` — if
   you've forked this app under your own bundle ID, use that instead)
5. Under **Capabilities**, check **iCloud** → **Edit**
6. Check **CloudKit**
7. Under **Containers**, click **+**, enter:
   `iCloud.io.tether.wdkstarterreactnative`
8. **Continue** → **Register**

### Step 2 — CloudKit Console: create the schema

1. Go to [icloud.developer.apple.com](https://icloud.developer.apple.com)
2. **CloudKit Database**
3. Select your container from the top dropdown
4. Left sidebar → **Schema** → **Record Types** → **+**
5. Record Type name: `WalletBackup`
6. Add three fields:

| Field Name | Type |
|---|---|
| `encryptionKey` | String |
| `savedAt` | String |
| `cloudEmail` | String |

7. **Save**
8. Left sidebar, bottom → **Deploy Schema Changes...** → confirm

> ⚠️ **Saving the schema is not enough — it must be deployed.** The Deploy
> step is what makes it active in the Development environment. Skipping
> this produces confusing schema errors on your very first upload attempt.

### Step 3 — CloudKit Console: generate the API token

1. Still in CloudKit Dashboard: left sidebar → **Settings** →
   **Tokens & Keys**
2. **Generate New Token** (or **+**)
3. Fill in:
   - **Name:** `WDK Starter Wallet`
   - **Sign in Callback:** select **URL Redirect**
   - **Redirect URL:** whatever you set `EXPO_PUBLIC_CLOUDKIT_CALLBACK_URL`
     to (see below) — it does **not** need to be a real, reachable page;
     this app intercepts the redirect before it ever actually loads, it
     just needs to match character-for-character.
   - **Allowed Origins:** Any Domain
   - **Discoverability:** check this if you want the person's real name
     (not email — Apple never exposes email via CloudKit JS) visible when
     they sign in. Optional.
4. **Save**
5. **Copy the token immediately** — some CloudKit Dashboard versions only
   show it once.

> ⚠️ **Sign in Callback must be URL Redirect, not Post Message.** Post
> Message mode is for browser popups and does not work with this app's
> WebView-based sign-in. If you accidentally create a Post Message token,
> just generate a new one — there's no way to convert an existing one.

### Step 4 — add to `.env`

```bash
EXPO_PUBLIC_CLOUDKIT_CONTAINER_ID=iCloud.io.tether.wdkstarterreactnative
EXPO_PUBLIC_CLOUDKIT_API_TOKEN=your_token_here
EXPO_PUBLIC_CLOUDKIT_CALLBACK_URL=https://your-chosen-domain.example/cloudkit-callback
```

### Step 5 — rebuild

```bash
npx expo prebuild --clean
npx expo run:ios --device
```

---

## 2. Google Drive Setup — Android side

### Step 1 — get your debug SHA-1 fingerprint

Run this after your first `expo prebuild`:

```bash
cd android && ./gradlew signingReport
```

Look for `Variant: debug` and copy the `SHA1` line:
```
SHA1: A1:B2:C3:D4:E5:F6:G7:H8:I9:J0:K1:L2:M3:N4:O5:P6:Q7:R8:S9:T0
```

Or directly from the debug keystore, without needing the `android/` folder:
```bash
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

**Remember:** this is your *debug* SHA-1 only. Before shipping a real
build, you'll also need to register the SHA-1 your release signing (e.g.
EAS Build) uses — get it via `eas credentials`. Registering only the
debug SHA-1 means sign-in works locally but fails for anyone testing a
release build.

### Step 2 — Google Cloud Console: create the Android OAuth client

1. Go to [console.cloud.google.com](https://console.cloud.google.com) →
   **New Project** → name it → Create
2. **APIs & Services → Credentials → + Create Credentials → OAuth Client ID**
3. Application type: **Android**
4. Package name: `io.tether.wdkstarterreactnative` (must exactly match
   `expo.android.package` in `app.json`)
5. SHA-1: paste from Step 1
6. **Create**

This client is required (it registers your SHA-1 with Google) even though
you never reference its ID directly in code.

### Step 3 — create the Web OAuth client

This is the one that actually goes in your `.env`.

1. **+ Create Credentials → OAuth Client ID**
2. Application type: **Web application**
3. Name: anything recognizable
4. **Create**
5. Copy the **Client ID** — looks like `123456789-abc.apps.googleusercontent.com`

**Important:** this Web Client ID is scoped to the Google Cloud **project**,
not to a specific app — it can be reused across multiple apps in the same
project without conflict (e.g. if you also maintain the showcase app under
the same project).

### Step 4 — enable the Drive API

1. **APIs & Services → Library**
2. Search `Google Drive API` → **Enable**

### Step 5 — configure the OAuth consent screen

1. **APIs & Services → OAuth consent screen**
2. User type: **External** → **Create**
3. App name, support email → **Save and Continue**
4. **Scopes** → **Add or Remove Scopes** → search `drive.appdata`, check
   it → **Update → Save and Continue**
5. **Test users** → **+ Add Users** → add the Gmail address(es) you'll
   test with → **Save and Continue**

> ⚠️ **The `drive.appdata` scope must be on the consent screen before
> sign-in.** Without it, Google silently returns an access token that
> lacks Drive permission — every backup attempt then fails with a 401,
> with no indication the scope is the problem.

---

## 3. Google Drive Setup — iOS side (this app only, not the showcase)

This entire section is **new setup the showcase's guide doesn't cover**,
because it only ever runs Google Sign-In on Android. Since this app lets
the person choose Google Drive on iOS too, Google Sign-In's iOS-native
requirements now apply.

### Step 1 — create the iOS OAuth client

Back in Google Cloud Console, same project as above:

1. **+ Create Credentials → OAuth Client ID**
2. Application type: **iOS**
3. Bundle ID: `io.tether.wdkstarterreactnative` (your iOS bundle
   identifier — note this is a **bundle ID**, not a SHA-1; iOS clients
   work differently from Android ones)
4. **Create**
5. Copy the **Client ID**

### Step 2 — add to `.env`

```bash
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=123456789-abc.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=987654321-xyz.apps.googleusercontent.com
```

### Step 3 — register the URL scheme in `app.json`

iOS needs a URL scheme registered so the OAuth redirect can route back
into the app — without it, sign-in fails **silently**, with no specific
error, which is what makes this step easy to skip and hard to diagnose
after the fact.

The scheme is your iOS client ID, **reversed**:

```
123456789-xyz.apps.googleusercontent.com
        ↓ becomes ↓
com.googleusercontent.apps.123456789-xyz
```

Add to `app.json`'s `plugins` array:

```json
[
  "@react-native-google-signin/google-signin",
  { "iosUrlScheme": "com.googleusercontent.apps.123456789-xyz" }
]
```

This is the **non-Firebase** variant of the plugin (we pass client IDs
directly via `.env`, not a `GoogleService-Info.plist`), which is why it
needs this explicit `iosUrlScheme` option rather than being registered
with no arguments.

### Step 4 — rebuild

```bash
npx expo prebuild --clean
npx expo run:ios --device
```

A JS-only reload will **not** pick up this change — both the `.env`
values (inlined at bundle time) and the `app.json` plugin (native config)
require a real rebuild.

---

## 4. Rebuild for Android

```bash
npx expo prebuild --clean
npx expo run:android
```

### Android runtime notes

- **`DEVELOPER_ERROR (10)`:** almost always means the SHA-1 for your
  current build isn't registered under the Android OAuth client. Re-run
  `./gradlew signingReport` and compare against what's registered in
  Google Cloud Console.
- **Package name mismatch:** the Android client's package name must
  exactly match `applicationId` in `android/app/build.gradle`, including
  any build-variant suffix (e.g. `.debug`).
- **Drive scope prompt:** on first sign-in, Google shows a permission
  dialog asking to grant Drive appdata access. If the person denies it,
  every subsequent backup attempt fails until they re-authenticate and
  accept.

---

## Sharing a CloudKit container across multiple apps?

Apple technically supports adding an existing container to a second app's
entitlements instead of creating a new one. Given this app's fixed wallet
ID (above), sharing a container with another app increases — low
probability, but real — collision risk if that app ever produces the same
record name. A separate container per app is the safer default; see
`ARCHITECTURE.md` for the full reasoning.

---

## Troubleshooting

### iOS

| Error | Cause | Fix |
|---|---|---|
| `Native module not found` | Built with Expo Go instead of a real dev build | Run `npx expo run:ios --device` |
| `Crypto.getRandomValues must be defined` | Missing polyfill | See `docs/TROUBLESHOOTING.md` |
| `RNGoogleSignin: failed to determine clientID` | Missing `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`, or `.env` change not picked up | Add the var, then `npx expo start --clear` — a normal reload won't re-inline `.env` values |
| Google Sign-In fails silently, no useful error | Missing `iosUrlScheme` config plugin registration | See Section 3, Step 3 — needs `prebuild --clean` after adding |
| Token not received after Apple ID sign-in | API token has Post Message callback instead of URL Redirect | Regenerate the token with URL Redirect |
| Schema errors on upload | `WalletBackup` schema saved but not deployed | CloudKit Console → Deploy Schema Changes |
| Tapping iCloud opens Google Sign-In (or vice versa) | A stale-state race in provider selection | Already fixed in this codebase — see `SECURITY.md`; if you see it again, check you haven't reintroduced a `state.provider` read inside `authenticate()` |
| Unlock screen pops up mid-backup after Google sign-in | Google's native Android picker Activity falsely triggers auto-lock | Already fixed via `lockSuppression.ts` — see `SECURITY.md` |

### Android

| Error | Cause | Fix |
|---|---|---|
| `DEVELOPER_ERROR (10)` | SHA-1 not registered, or package name mismatch | Register the correct SHA-1 under the Android OAuth client |
| `authentication failed` / backup write fails | `drive.appdata` scope missing from the access token | Add the scope on the consent screen; re-sign-in afterward |
| `Google Sign-In cancelled` | Person dismissed the sign-in prompt | Normal — they can just retry |
| `Play Services not available` | Device has no Google Play Services | Not supported on that device |

---

## Building for production

```bash
# iOS
npx expo prebuild --clean
npx expo run:ios --configuration Release --device

# Android
npx expo prebuild --clean
npx expo run:android --variant release
```

For App Store / Play Store submission, use EAS Build:

```bash
npm install -g eas-cli
eas build --platform ios
eas build --platform android
```

Remember: EAS Build signs with its own credentials, separate from your
local debug keystore — register that build's SHA-1 (Android) too, via
`eas credentials`, or Google Sign-In will work locally but fail for
anyone testing a release build.

---

## What's not built yet

`CloudBackupContext.downloadBackup()` exists and is ready to use, but no
screen calls it yet — restoring a wallet from an existing cloud backup
isn't wired up. The architecture notes on the provider-threading bug and
the auto-lock suppression bug are in `SECURITY.md` if you want the full
technical explanation rather than just the troubleshooting-table summary
above.
