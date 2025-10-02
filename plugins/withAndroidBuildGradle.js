const { withProjectBuildGradle, withAppBuildGradle } = require('@expo/config-plugins');

/**
 * Config plugin to fix react-native-fast-pbkdf2 compileSdk requirement
 * and add C++20 support
 */
module.exports = function withAndroidBuildGradle(config) {
  // Fix project-level build.gradle for react-native-fast-pbkdf2
  config = withProjectBuildGradle(config, config => {
    const { contents } = config.modResults;

    // Check if the fix is already applied
    if (contents.includes('react-native-fast-pbkdf2')) {
      return config;
    }

    // Add the fix after allprojects block
    const allProjectsPattern = /(allprojects\s*\{[^}]*\})/;

    const fix = `
  // Fix for react-native-fast-pbkdf2 compileSdk requirement
  afterEvaluate { project ->
    if (project.name == 'react-native-fast-pbkdf2') {
      project.android {
        compileSdkVersion 36
      }
    }
  }`;

    config.modResults.contents = contents.replace(allProjectsPattern, `$1\n${fix}`);

    return config;
  });

  // Fix app-level build.gradle for C++20 support and APK optimization
  config = withAppBuildGradle(config, config => {
    let contents = config.modResults.contents;

    // Check if C++20 flag is already applied
    if (!contents.includes('cppFlags "-std=c++20"')) {
      // Add C++20 flag after the buildConfigField line in defaultConfig
      const buildConfigPattern =
        /(buildConfigField\s+"String",\s+"REACT_NATIVE_RELEASE_LEVEL"[^\n]*\n)/;

      const cppFix = `$1
        externalNativeBuild {
            cmake {
                cppFlags "-std=c++20"
            }
        }
`;

      contents = contents.replace(buildConfigPattern, cppFix);
    }

    // Add APK splits configuration if not already present
    if (!contents.includes('splits {')) {
      const androidBlockPattern = /(android\s*\{[^\n]*\n)/;

      const splitsConfig = `$1    splits {
        abi {
            reset()
            enable true
            universalApk false
            include "arm64-v8a", "armeabi-v7a", "x86_64"
        }
    }
`;

      contents = contents.replace(androidBlockPattern, splitsConfig);
    }

    // Enable native debug symbol stripping in release builds
    if (!contents.includes('ndk {') && contents.includes('defaultConfig {')) {
      const defaultConfigClosingPattern = /(externalNativeBuild\s*\{[^}]*\}\s*\}\s*)\n(\s*)\}/;

      const ndkConfig = `$1
$2    ndk {
$2        debugSymbolLevel 'SYMBOL_TABLE'
$2    }
$2}`;

      contents = contents.replace(defaultConfigClosingPattern, ndkConfig);
    }

    config.modResults.contents = contents;
    return config;
  });

  return config;
};
