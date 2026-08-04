// app.config.js
//
// Thin overlay on top of app.json. Expo evaluates app.json first and passes the
// result in as `config`, so everything static stays in app.json and only the
// values a fresh fork/CI has to override live here.
//
// require('dotenv').config() is explicit and deliberate, not redundant with
// Expo's own auto-loading: "Expo CLI" commands (npx expo prebuild, npx expo
// config) DO auto-load .env, but `eas build` — which this project's own EAS
// setup uses — does NOT load .env the same way. Loading it explicitly here
// means this file behaves identically regardless of which tool actually
// runs it, rather than working locally and silently breaking in a real EAS
// build.
require('dotenv').config();

// `slug` and `extra.eas.projectId` must resolve at *build* time, not just at
// submit time: eas.json sets `appVersionSource: "remote"` with
// `autoIncrement: true`, so `eas build` contacts the EAS API to read and bump
// the build number and needs to know which project to talk to.
//
// Locally all of these fall back to the committed default values, so
// `npx expo prebuild` and `npm run ios` work with no environment set at all —
// only someone actually forking this to ship their OWN app needs to set any
// of these.
const EAS_PROJECT_ID = 'REPLACE_WITH_EAS_PROJECT_ID';

// Deliberately NOT separate hardcoded default constants for bundle
// identifier / package name / CloudKit container — those defaults are
// read directly from app.json's own values below (config.ios.*,
// config.android.*), matching Expo's own documented convention of
// keeping a static default/placeholder in app.json that a dynamic config
// then overrides. Two hardcoded copies of the same default (one here,
// one in app.json) would risk silently drifting out of sync if someone
// updated one and not the other — a real, confirmed version of this
// class of bug already happened once in this project's own history with
// dynamically-built env var keys (see docs/RELEASE.md's "Verify env
// values actually reach the bundle" section).

/**
 * Derives Google's "reversed client ID" iOS URL scheme from the OAuth
 * client ID itself, rather than requiring a second, separately-maintained
 * env var for what is mechanically the same value rearranged. Google's own
 * convention: '{prefix}.apps.googleusercontent.com' -> reversed as
 * 'com.googleusercontent.apps.{prefix}' — confirmed directly against this
 * project's own existing app.json value before writing this function, not
 * assumed.
 */
function reversedGoogleClientId(clientId) {
  if (!clientId || !clientId.includes('.apps.googleusercontent.com')) return undefined;
  const prefix = clientId.split('.apps.googleusercontent.com')[0];
  return `com.googleusercontent.apps.${prefix}`;
}

module.exports = ({ config }) => {
  const iosBundleIdentifier = process.env.IOS_BUNDLE_IDENTIFIER || config.ios.bundleIdentifier;
  const androidPackage = process.env.ANDROID_PACKAGE_NAME || config.android.package;
  const cloudKitContainerId =
    process.env.EXPO_PUBLIC_CLOUDKIT_CONTAINER_ID ||
    config.ios.entitlements?.['com.apple.developer.icloud-container-identifiers']?.[0];
  const googleIosUrlScheme = reversedGoogleClientId(process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID);

  return {
    ...config,
    slug: process.env.EAS_PROJECT_SLUG || config.slug,

    ios: {
      ...config.ios,
      bundleIdentifier: iosBundleIdentifier,
      entitlements: {
        ...config.ios.entitlements,
        // Only this one field is overridden — everything else declared in
        // app.json's entitlements (e.g. icloud-services) passes through
        // untouched via the spread above.
        'com.apple.developer.icloud-container-identifiers': [cloudKitContainerId],
      },
    },

    android: {
      ...config.android,
      package: androidPackage,
    },

    // Only the Google Sign-In plugin's own config entry is touched — every
    // other plugin (expo-router, expo-navigation-bar, expo-secure-store,
    // the two custom modules, etc.) passes through completely unchanged.
    plugins: config.plugins.map((plugin) => {
      const isGoogleSignInPlugin =
        Array.isArray(plugin) && plugin[0] === '@react-native-google-signin/google-signin';
      if (isGoogleSignInPlugin && googleIosUrlScheme) {
        return [plugin[0], { ...plugin[1], iosUrlScheme: googleIosUrlScheme }];
      }
      return plugin;
    }),

    extra: {
      ...config.extra,
      eas: {
        ...config.extra?.eas,
        projectId: process.env.EAS_PROJECT_ID || EAS_PROJECT_ID,
      },
    },
  };
};