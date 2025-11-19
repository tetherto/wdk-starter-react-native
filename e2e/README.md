# E2E Tests

Simple TypeScript E2E testing setup using WebdriverIO and Appium.

## Setup

```bash
npm install
```

## Build APK

From project root:

```bash
npm run e2e:build-apk
```

This builds a **standalone release APK** with the JS bundle embedded and copies
it to `apps/app-release.apk`.

**Note:** This is a standalone build - no Metro bundler or dev server needed.
The JS bundle is embedded in the APK.

## Run Tests

Update the device capabilities in `wdio.conf.ts` to match your emulator or
physical device.

For example, in `wdio.conf.ts` (line 13 in the `capabilities` array):

```typescript
capabilities: [
  {
    platformName: 'Android',
    'appium:platformVersion': '13', // e.g. set to your device or emulator version
    'appium:deviceName': 'Pixel_5_API_33', // set to your device or emulator name
    // ... rest of the config
  },
],
```

Change `'appium:platformVersion'` and `'appium:deviceName'` to match your own
setup.

Make sure Appium is running:

```bash
appium
```

Then run tests:

```bash
npm test
```

## Structure

```
e2e/
├── wdio.conf.ts          # WebdriverIO config (TypeScript)
├── tsconfig.json         # TypeScript config
├── package.json          # Dependencies
├── test/
│   └── specs/
│       └── test.e2e.ts   # Test files
└── apps/                 # APK files (gitignored)
    └── app-release.apk   # Standalone release APK
```

## Configuration

The APK path is configured in `wdio.conf.ts`:

```typescript
'appium:app': path.join(__dirname, 'apps/app-release.apk')
```

After building, the APK will be in `apps/app-release.apk`.
