# E2E Tests

TypeScript E2E testing setup using WebdriverIO and Appium.

## Setup

```bash
cd e2e
npm install
```

## Qase Integration

Tests are integrated with Qase test management using `qase-javascript-commons`.

### Setup

1. **Get Qase credentials:**
   - API Token: https://app.qase.io/user/api/token
   - Project Code: Your Qase project settings

2. **Configure environment variables:**

```bash
export QASE_API_TOKEN=your_api_token
export QASE_PROJECT_CODE=your_project_code
```

Or create a `.env` file in the `e2e` directory:

```
QASE_API_TOKEN=your_api_token
QASE_PROJECT_CODE=your_project_code
QASE_RUN_ID=optional_run_id  # Optional: existing test run ID
```

### Usage

Tests are wrapped with `qase(testCaseId, testFunction)`:

```typescript
it(
  'TW-1: First launch',
  qase('TW-1', async () => {
    // test code
  })
);
```

Results are automatically reported to Qase when credentials are configured.

## Generate Release Builds

### iOS

From project root:

```bash
npx expo export --platform ios --output-dir ./dist
npx expo run:ios --configuration Release
```

This creates a Release build in Xcode DerivedData. The e2e build script will
copy it.

### Android

From project root:

```bash
npx expo export --platform android --output-dir ./dist
npx expo prebuild --platform android --clean
cd android
./gradlew assembleRelease
```

The APK will be at `android/app/build/outputs/apk/release/app-release.apk`.

## Running Tests

### iOS Tests

1. **Build for E2E** (from project root):

   ```bash
   cd e2e
   npm run build-ios
   ```

   This exports the JS bundle and copies the Release build to
   `e2e/apps/wdkstarterreactnative.app`.

   **Note:** Requires a Release build (see "Generate Release Builds" above).

2. **Update capabilities** in `wdio.ios.conf.ts` (platform version, device name)

3. **Ensure iOS simulator is running**

4. **Run tests:**
   ```bash
   cd e2e
   npm run test:ios
   ```

### Android Tests

1. **Build for E2E** (from project root):

   ```bash
   cd e2e
   npm run build-apk
   ```

   This builds a standalone release APK with embedded JS bundle to
   `e2e/apps/app-release.apk`.

   **Note:** This script handles the full build process (export, prebuild,
   assemble).

2. **Update capabilities** in `wdio.android.conf.ts` (platform version, device
   name)

3. **Start Android emulator or connect device**

4. **Run tests:**
   ```bash
   cd e2e
   npm run test:android
   ```

### Run Both Platforms

To run tests on both iOS and Android sequentially:

```bash
cd e2e
npm run test:all
```

**Note:** `npm test` defaults to iOS tests.

## Configuration

### Platform-Specific Configs

The project uses separate configuration files for each platform:

- **`wdio.base.conf.ts`** - Shared configuration (hooks, timeouts, etc.)
- **`wdio.ios.conf.ts`** - iOS-specific capabilities
- **`wdio.android.conf.ts`** - Android-specific capabilities

### Updating Device Capabilities

**iOS** (`wdio.ios.conf.ts`):

```typescript
capabilities: [
  {
    platformName: 'iOS',
    'appium:platformVersion': '26.1', // Your iOS version
    'appium:deviceName': 'iPhone 17 Pro', // Your simulator name
    // ...
  },
],
```

**Android** (`wdio.android.conf.ts`):

```typescript
capabilities: [
  {
    platformName: 'Android',
    'appium:platformVersion': '14.0', // Your Android version
    'appium:deviceName': 'Android Emulator', // Your emulator/device name
    // ...
  },
],
```

## Structure

```
e2e/
├── wdio.base.conf.ts     # Base WebdriverIO config (shared settings)
├── wdio.ios.conf.ts      # iOS-specific config
├── wdio.android.conf.ts  # Android-specific config
├── test/specs/           # Test files
├── pageObjects/          # Page object models
└── apps/                 # Built apps (gitignored)
    ├── app-release.apk   # Android APK
    └── wdkstarterreactnative.app  # iOS app
```
