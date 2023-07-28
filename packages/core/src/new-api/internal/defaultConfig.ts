import { DeployConfig } from "../types/deployer";

/**
 * The interval, in milliseconds, between checks to see if a new block
 * has been created
 */
const DEFAULT_BLOCK_POLLING_INTERVAL = 1000;

/**
 * The amount of time, in milliseconds, to wait on a transaction to
 * confirm before timing out
 */
const DEFAULT_TRANSACTION_TIMEOUT_INTERVAL = 3 * 60 * 1000;

/**
 * The number of block confirmations to wait before considering
 * a transaction to be confirmed during Ignition execution.
 */
const DEFAULT_BLOCK_CONFIRMATIONS = 5;

/**
 * Ignitions default deployment configuration values.
 */
export const defaultConfig: DeployConfig = {
  blockPollingInterval: DEFAULT_BLOCK_POLLING_INTERVAL,
  transactionTimeoutInterval: DEFAULT_TRANSACTION_TIMEOUT_INTERVAL,
  blockConfirmations: DEFAULT_BLOCK_CONFIRMATIONS,
};
