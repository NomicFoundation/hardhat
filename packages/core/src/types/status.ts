import { DeployedContract, ExecutionErrorDeploymentResult } from "./deploy";

/**
 * The result of requesting the status of a deployment. It lists the futures
 * broken down by their status, and includes the deployed contracts.
 *
 * @beta
 */
export interface StatusResult
  extends Omit<ExecutionErrorDeploymentResult, "type"> {
  contracts: {
    [key: string]: DeployedContract;
  };
}
