/* eslint-disable-next-line @typescript-eslint/no-empty-interface -- Empty
interface allow plugins to extend the Test user configuration for Hardhat. */
export interface HardhatTestUserConfig {}

/* eslint-disable-next-line @typescript-eslint/no-empty-interface -- Empty
interface allow plugins to extend the Test configuration for Hardhat. */
export interface HardhatTestConfig {}

/**
 * Summary of a test run, containing counts of test outcomes and optional
 * failure output. All fields are optional because different test runners
 * may provide different subsets.
 */
export interface TestSummary {
  failed?: number;
  passed?: number;
  skipped?: number;
  todo?: number;
  failureOutput?: string;
}
