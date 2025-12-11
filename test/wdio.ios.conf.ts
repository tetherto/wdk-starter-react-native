import type { Options } from '@wdio/types';
import * as path from 'path';

export const config = {
  runner: 'local',
  port: 4723,
  
  specs: ['./e2e/specs/**/*.ts'],
  exclude: [],

  maxInstances: 1,

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

  logLevel: 'info',
  bail: 0,
  waitforTimeout: 10000,
  connectionRetryTimeout: 240000,
  connectionRetryCount: 3,

  services: [
    [
      'appium',
      {
        command: 'appium',
      },
    ],
  ],
  framework: 'mocha',
  reporters: ['spec'],

  mochaOpts: {
    ui: 'bdd',
    timeout: 120000, // 2 minutes - wallet creation can take 30-60 seconds, plus other test steps
  },
};
