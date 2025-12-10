import type { Options } from '@wdio/types';
import * as path from 'path';
import { baseConfig } from './wdio.base.conf';

/**
 * Android-specific WebdriverIO configuration
 */
export const config: Options.Testrunner = {
  ...baseConfig,
  
  capabilities: [
    {
      platformName: 'Android',
      'appium:platformVersion': '16', // Android version
      'appium:deviceName': 'emulator-5554', // Device/emulator name
      'appium:app': path.join(__dirname, 'test/apps/app-release.apk'),
      'appium:automationName': 'UiAutomator2',
      'appium:appPackage': 'com.anonymous.wdkstarterreactnative',
      'appium:appActivity': '.MainActivity',
      'appium:noReset': false,
      'appium:fullReset': false,
      'appium:newCommandTimeout': 600,
      'appium:appWaitTimeout': 60000,
      'appium:uiautomator2ServerLaunchTimeout': 120000,
      'appium:uiautomator2ServerInstallTimeout': 120000,
    },
  ],
} as Options.Testrunner;

