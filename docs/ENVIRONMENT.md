# Environment Setup

Read this **before** running `npm install`. Nearly every confusing native
build failure this project has hit traced back to a toolchain mismatch, not
a code bug — and the failures rarely look like version problems. They look
like a generic native crash with no obvious cause.

## Required versions (pin these exactly, don't assume "latest works")

| Tool | Required | Why |
|---|---|---|
| Node.js | ≥ 20 | — |
| npm | **≥ 11** | npm 10 silently drops packages (like `expo` itself) from git-dependency trees, with no error. This is the single most confusing failure mode in this project's history — everything *looks* installed, but the app crashes at runtime with a missing-module error. Check with `npm --version` before anything else. |
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

If `npm install` ever suggests a newer version for any of these three,
**don't take it** without first checking `docs/TROUBLESHOOTING.md` and the
relevant package's changelog.

## Fresh install checklist

```bash
node --version   # >= 20
npm --version    # >= 11 — if not, `npm install -g npm@latest`
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
- **iOS**: the `modules/cloud-backup/withModularHeaders.js` config plugin is
  required for CocoaPods modular-headers issues caused by Google Sign-In's
  Firebase pods and Spark wallet's gRPC/SwiftNIO pods. It's already
  registered in `app.json` — you shouldn't need to touch it unless you add
  new native dependencies that reintroduce a similar pod conflict.

## When something breaks and you don't know why

1. Confirm `npm --version` and `java --version` first — they cause the most
   misleading failures.
2. `rm -rf node_modules package-lock.json android ios && npm install &&
npx expo prebuild --clean` — a full clean rebuild resolves most native
   state corruption issues.
3. Check `docs/TROUBLESHOOTING.md` for this exact error message — several
   entries there look like unrelated native crashes but have a specific,
   known root cause.
