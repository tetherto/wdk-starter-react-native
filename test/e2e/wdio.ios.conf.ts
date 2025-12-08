import type { Options } from '@wdio/types';
import * as path from 'path';
import { baseConfig } from './wdio.base.conf';

/**
 * iOS-specific WebdriverIO configuration
 */
export const config: Options.Testrunner = {
  ...baseConfig,
  
  capabilities: [
    {
      platformName: 'iOS',
      'appium:platformVersion': '26.1',
      'appium:deviceName': 'iPhone 17 Pro',
      'appium:app': path.join(__dirname, 'apps/wdkstarterreactnative.app'),
      'appium:automationName': 'XCUITest',
      'appium:bundleId': 'com.anonymous.wdkstarterreactnative',
      'appium:noReset': false,
      'appium:fullReset': false,
      'appium:newCommandTimeout': 600,
      'appium:appWaitTimeout': 60000,
      'appium:wdaLaunchTimeout': 120000,
      'appium:wdaConnectionTimeout': 120000,
    },
  ],
} as Options.Testrunner;

