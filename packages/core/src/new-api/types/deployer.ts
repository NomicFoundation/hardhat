import { IgnitionModule, IgnitionModuleResult } from "./module";

/**
 * Configuration options for the deployment.
 *
 * @beta
 */
export interface DeployConfig {
  blockPollingInterval: number;
  transactionTimeoutInterval: number;
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
 * The successfully deployed contract from the deployment run.
 *
 * @beta
 */
export type DeploymentResultContracts = Record<
  string,
  { contractName: string; contractAddress: string; storedArtifactPath: string }
>;
