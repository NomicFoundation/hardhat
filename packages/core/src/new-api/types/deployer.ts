import { IgnitionModule, IgnitionModuleResult } from "./module";

/**
 * The result of a deployment run.
 *
 * @beta
 */
export type DeploymentResult =
  | DeploymentResultSuccess
  | DeploymentResultFailure
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
 * The result of a failed deployment run (at least one future had an
 * failed transaction).
 *
 * @beta
 */
export interface DeploymentResultFailure {
  status: "failure";
  errors: { [key: string]: Error };
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
