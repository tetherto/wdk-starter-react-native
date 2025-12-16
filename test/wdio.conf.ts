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
      platformName: 'Android',
      'appium:platformVersion': '16',
      'appium:deviceName': 'Android Emulator',
      'appium:app': path.join(__dirname, 'apps/app-release.apk'),
      'appium:automationName': 'UiAutomator2',
      'appium:appWaitActivity': '*',
      'appium:noReset': false,
      'appium:fullReset': false,
      'appium:skipServerInstallation': false,
      'appium:newCommandTimeout': 600,
      'appium:autoGrantPermissions': true,
      'appium:appWaitTimeout': 60000,
      'appium:uiautomator2ServerLaunchTimeout': 120000,
      'appium:uiautomator2ServerInstallTimeout': 120000,
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
