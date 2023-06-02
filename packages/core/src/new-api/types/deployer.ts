import { IgnitionModule, IgnitionModuleResult } from "./module";

/**
 * The result of a deployment run.
 *
 * @beta
 */
export type DeploymentResult =
  | DeploymentResultSuccess
  | {
      status: "failed" | "hold";
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
 * The successfully deployed contract from the deployment run.
 *
 * @beta
 */
export type DeploymentResultContracts = Record<
  string,
  { contractName: string; contractAddress: string; storedArtifactPath: string }
>;
