/**
 * Qase wrapper utility for WebdriverIO/Mocha tests
 * Provides a qase() function that matches @tetherto/qase-utils API
 */

import stripAnsi from 'strip-ansi';
import type { ResultCreate, RunCreate } from 'qase-api-client/dist/model';

interface QaseConfig {
  apiToken?: string;
  projectCode?: string;
  baseUrl?: string;
  platform?: string; // Platform name (e.g., 'iOS', 'Android')
}

let qaseConfig: QaseConfig = {};

/**
 * Initialize Qase configuration
 */
export function initQase(config: QaseConfig) {
  qaseConfig = {
    apiToken: config.apiToken || process.env.QASE_API_TOKEN,
    projectCode: config.projectCode || process.env.QASE_PROJECT_CODE,
    baseUrl: config.baseUrl || process.env.QASE_API_BASE_URL || 'https://api.qase.io/v1',
    platform: config.platform || process.env.QASE_PLATFORM,
  };
}

/**
 * Qase test wrapper function
 * Usage: it('Test name', qase('TEST-CASE-ID', async () => { ... }))
 */
export function qase(testCaseId: string, testFn: () => void | Promise<void>) {
  return async function qaseWrappedTest() {
    const startTime = Date.now();
    testStartTimes.set(testCaseId, startTime);
    
    try {
      await testFn();
      // Test passed - report to Qase if configured
      if (qaseConfig.apiToken && qaseConfig.projectCode) {
        const duration = Date.now() - startTime;
        await reportTestResult(testCaseId, true, undefined, startTime, duration);
      }
    } catch (error) {
      // Test failed - report to Qase if configured
      if (qaseConfig.apiToken && qaseConfig.projectCode) {
        const duration = Date.now() - startTime;
        await reportTestResult(testCaseId, false, error, startTime, duration);
      }
      throw error;
    } finally {
      testStartTimes.delete(testCaseId);
    }
  };
}

// Store test run ID for the session
let testRunId: number | null = null;
let runStartTime: number | null = null;
const testStartTimes = new Map<string, number>();

/**
 * Report test result to Qase API
 */
async function reportTestResult(
  testCaseId: string,
  passed: boolean,
  error?: unknown,
  startTime?: number,
  duration?: number
): Promise<void> {
  if (!qaseConfig.apiToken || !qaseConfig.projectCode) {
    return;
  }

  try {
    const { ResultsApi, RunsApi, Configuration } = await import('qase-api-client');
    
    // Create configuration with API token
    // Qase API v1 base path should be: https://api.qase.io/v1
    const baseUrl = qaseConfig.baseUrl || 'https://api.qase.io/v1';
    const configuration = new Configuration({
      apiKey: (name: string) => name === 'Token' ? qaseConfig.apiToken! : '',
      basePath: baseUrl,
    });

    const resultsApi = new ResultsApi(configuration);
    const runsApi = new RunsApi(configuration);

    // Get or create test run
    if (!testRunId) {
      const runId = process.env.QASE_RUN_ID;
      if (runId) {
        testRunId = parseInt(runId);
        runStartTime = Date.now();
        console.log(`[Qase] Using existing test run ID: ${testRunId}`);
      } else {
        // Extract numeric case ID from testCaseId (e.g., "TW-1" -> 1)
        const caseId = parseInt(testCaseId.replace(/\D/g, '')) || 0;
        
        // Create new test run with start time
        runStartTime = Date.now();
        // Format: Y-m-d H:i:s (e.g., "2025-11-27 19:37:17")
        const startTimeStr = new Date(runStartTime).toISOString().replace('T', ' ').substring(0, 19);
        
        // Try to detect platform from global driver if available
        let platformName = qaseConfig.platform;
        try {
          // Access WebdriverIO global driver to get platform
          const driver = (global as any).driver || (global as any).browser;
          if (driver?.capabilities?.platformName) {
            platformName = driver.capabilities.platformName;
          }
        } catch (e) {
          // Ignore if driver not available
        }
        
        // Build test run title with platform if available
        const platformSuffix = platformName ? ` [${platformName}]` : '';
        const runTitle = `E2E Test Run${platformSuffix} - ${new Date().toISOString()}`;
        const runData: RunCreate = {
          title: runTitle,
          cases: caseId > 0 ? [caseId] : [],
          start_time: startTimeStr,
        };
        
        console.log(`[Qase] Creating new test run for project: ${qaseConfig.projectCode}`);
        console.log(`[Qase] Test run title: ${runTitle}`);
        const runResponse = await runsApi.createRun(qaseConfig.projectCode!, runData);
        testRunId = runResponse.data.result?.id || null;
        if (testRunId) {
          console.log(`[Qase] ✓ Created test run ID: ${testRunId}`);
        }
      }
    }

    if (!testRunId) {
      console.warn(`[Qase] Could not create or find test run`);
      return;
    }

    // Extract numeric case ID from testCaseId (e.g., "TW-1" -> 1)
    const caseId = parseInt(testCaseId.replace(/\D/g, '')) || 0;
    
    // Calculate duration if provided, otherwise use current time - start time
    const testDuration = duration !== undefined 
      ? duration 
      : (startTime ? Math.round(Date.now() - startTime) : undefined);
    
    // Format error message for Qase
    let formattedComment: string | undefined;
    if (error) {
      // Extract error message from various error object formats
      let errorStr = '';
      if (error instanceof Error) {
        errorStr = error.message || error.toString();
      } else if (typeof error === 'object' && error !== null) {
        // Try common error object properties
        errorStr = (error as any).message || 
                   (error as any).error || 
                   (error as any).stack ||
                   JSON.stringify(error);
      } else {
        errorStr = String(error);
      }
      
      // Strip ANSI color codes
      let cleanError = stripAnsi(errorStr);
      
      // Try to extract key information from WebdriverIO/Jest error messages
      // Pattern 1: "Expected substring: X, Received string: Y"
      const expectedSubstringMatch = cleanError.match(/Expected substring[:\s]+(.+?)(?:\n|Received|$)/i);
      const receivedStringMatch = cleanError.match(/Received string[:\s]+(.+?)(?:\n|$)/i);
      
      // Pattern 2: "Expected: X, Received: Y"
      const expectedMatch = cleanError.match(/Expected[:\s]+(.+?)(?:\n|Received|$)/i);
      const receivedMatch = cleanError.match(/Received[:\s]+(.+?)(?:\n|$)/i);
      
      // Pattern 3: Assertion failure with expect()
      const assertionMatch = cleanError.match(/(expect\(.+?\)\.(?:toContain|toBe|toEqual|toMatch).+?)/i);
      
      if (expectedSubstringMatch && receivedStringMatch) {
        // Format as a clear comparison (WebdriverIO format)
        formattedComment = `Assertion Failed:\n\nExpected substring: ${expectedSubstringMatch[1].trim()}\nReceived string: ${receivedStringMatch[1].trim()}`;
      } else if (expectedMatch && receivedMatch) {
        // Format as a clear comparison (Jest format)
        formattedComment = `Assertion Failed:\n\nExpected: ${expectedMatch[1].trim()}\nReceived: ${receivedMatch[1].trim()}`;
      } else if (assertionMatch) {
        // Use the assertion line if available
        formattedComment = `Assertion Failed: ${assertionMatch[1].trim()}`;
      } else {
        // Extract first meaningful line (skip stack traces and ANSI codes)
        const lines = cleanError.split('\n').filter(line => {
          const trimmed = line.trim();
          return trimmed && 
                 !trimmed.startsWith('at ') && 
                 !trimmed.startsWith('Error:') &&
                 !trimmed.includes('node_modules') &&
                 !trimmed.match(/^\x1b\[/); // Skip ANSI escape sequences
        });
        formattedComment = lines.slice(0, 5).join('\n').substring(0, 1000);
      }
      
      // Ensure comment doesn't exceed Qase's limit
      if (formattedComment && formattedComment.length > 1000) {
        formattedComment = formattedComment.substring(0, 997) + '...';
      }
    }
    
    // Create result with duration
    // time_ms is in milliseconds - Qase will use this for duration
    // We don't send start_time to avoid Qase calculating duration incorrectly
    const result: ResultCreate = {
      status: passed ? 'passed' : 'failed',
      case_id: caseId > 0 ? caseId : undefined,
      comment: formattedComment,
      time_ms: testDuration ? testDuration : undefined, // Duration in milliseconds
    };

    const durationMsg = testDuration ? ` (Duration: ${testDuration}ms)` : '';
    console.log(`[Qase] Sending API request: POST /result (Run: ${testRunId}, Case: ${caseId}, Status: ${result.status}${durationMsg})`);
    const response = await resultsApi.createResult(
      qaseConfig.projectCode!,
      testRunId,
      result
    );

    if (response.data.status) {
      const resultHash = response.data.result?.hash || 'N/A';
      console.log(`[Qase] ✓ API request successful - Result hash: ${resultHash}`);
    }
  } catch (err: any) {
    // Log error but don't break tests
    const errorMsg = err?.response?.data?.errorMessage || err?.message || String(err);
    console.warn(`[Qase] ✗ API request failed: ${errorMsg}`);
    if (err?.response?.status) {
      console.warn(`[Qase] HTTP Status: ${err.response.status}`);
    }
    if (err?.response?.data) {
      console.warn(`[Qase] Response:`, JSON.stringify(err.response.data, null, 2));
    }
  }
}

/**
 * Complete the test run with total duration
 */
export async function completeTestRun(): Promise<void> {
  if (!qaseConfig.apiToken || !qaseConfig.projectCode || !testRunId || !runStartTime) {
    return;
  }

  try {
    const { RunsApi, Configuration } = await import('qase-api-client');
    const baseUrl = qaseConfig.baseUrl || 'https://api.qase.io/v1';
    const configuration = new Configuration({
      apiKey: (name: string) => name === 'Token' ? qaseConfig.apiToken! : '',
      basePath: baseUrl,
    });

    const runsApi = new RunsApi(configuration);
    const totalDuration = Date.now() - runStartTime;
    
    console.log(`[Qase] Completing test run ${testRunId} (Total duration: ${totalDuration}ms)`);
    await runsApi.completeRun(qaseConfig.projectCode!, testRunId);
    console.log(`[Qase] ✓ Test run completed`);
  } catch (err: any) {
    const errorMsg = err?.response?.data?.errorMessage || err?.message || String(err);
    console.warn(`[Qase] ✗ Failed to complete test run: ${errorMsg}`);
  }
}

// Auto-initialize on import
initQase({});

