import { Artifact } from "./artifact";
import {
  IgnitionModule,
  IgnitionModuleResult,
  ModuleParameters,
} from "./module";

/**
 * Configuration options for the deployment.
 *
 * @beta
 */
export interface DeployConfig {
  /**
   * The interval, in milliseconds, between checks to see if a new block
   * has been created
   */
  blockPollingInterval: number;

  /**
   * The amount of time, in milliseconds, to wait on a transaction to
   * confirm before timing out
   */
  transactionTimeoutInterval: number;

  /**
   * The number of block confirmations to wait before considering
   * a transaction to be confirmed during Ignition execution.
   */
  blockConfirmations: number;
}

/**
 * The result of a deployment run.
 *
 * @beta
 */
export type DeploymentResult =
  | DeploymentResultSuccess
  | DeploymentResultFailure
  | DeploymentResultTimeout
  | {
      status: "hold";
    };

/**
 * The result of a successful deployment run.
 *
 * @beta
 */
export interface DeploymentResultSuccess {
  status: "success";
  contracts: DeploymentResultContracts;
  module: IgnitionModule<string, string, IgnitionModuleResult<string>>;
}

/**
 * The result of a failed deployment run where at least one future had a
 * failed transaction.
 *
 * @beta
 */
export interface DeploymentResultFailure {
  status: "failure";
  errors: { [key: string]: Error };
}

/**
 * The result a deployment run where at least one transaction has timed
 * out and is still pending.
 *
 * @beta
 */
export interface DeploymentResultTimeout {
  status: "timeout";
  timeouts: Array<{ futureId: string; executionId: number; txHash: string }>;
}

/**
 * A successfully deployed contract from the deployment run.
 *
 * @beta
 */
export interface DeploymentResultContract {
  contractName: string;
  contractAddress: string;
  artifact: Artifact;
}

/**
 * The successfully deployed contracts from the deployment run.
 *
 * @beta
 */
export type DeploymentResultContracts = Record<
  string,
  DeploymentResultContract
>;

/**
 * An object containing a map of module ID's to their respective ModuleParameters.
 *
 * @beta
 */
export interface DeploymentParameters {
  [moduleId: string]: ModuleParameters;
}
