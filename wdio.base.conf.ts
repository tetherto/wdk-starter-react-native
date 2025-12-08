import type { Options } from '@wdio/types';
import * as path from 'path';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '.env') });

/**
 * Base WebdriverIO configuration shared by all platforms
 */
export const baseConfig: Partial<Options.Testrunner> = {
  runner: 'local',
  port: 4723,
  
  specs: ['./test/e2e/specs/**/*.ts'],
  exclude: [],

  maxInstances: 1,

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
    timeout: 60000,
  },

  /**
   * Gets executed before test execution begins. At this point you can access to all global
   * variables like `browser`. It is the perfect place to define custom commands.
   * @param {Array.<Object>} capabilities list of capabilities details
   * @param {Array.<String>} specs        List of spec file paths that ran
   * @param {object}         browser      instance of created browser/device session
   */
  before: async function (capabilities, specs) {
    // Set platform name for Qase test run naming
    // Check both platformName and appium:platformName
    const caps = Array.isArray(capabilities) ? capabilities[0] : capabilities;
    const platformName = (caps as any)?.platformName || 
                         (caps as any)?.['appium:platformName'] ||
                         process.env.QASE_PLATFORM;
    if (platformName) {
      const { initQase } = await import('./test/e2e/utils/qase-wrapper');
      initQase({ platform: platformName });
      console.log(`[Qase] Platform set to: ${platformName}`);
    }
  },

  /**
   * Gets executed after all tests are done. You still have access to all global variables from
   * the test.
   * @param {number} result 0 - test pass, 1 - test fail
   * @param {Array.<Object>} capabilities list of capabilities details
   * @param {Array.<String>} specs List of spec file paths that ran
   */
  after: async function (result, capabilities, specs) {
    try {
      const { completeTestRun } = await import('./test/e2e/utils/qase-wrapper');
      await completeTestRun();
    } catch (error) {
      console.warn('[Qase] Error completing test run:', error);
    }
  },
};

