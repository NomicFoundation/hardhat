import type { Abi } from "./artifact.js";
import type {
  DeployedContract,
  ExecutionErrorDeploymentResult,
} from "./deploy.js";

/**
 * The information of a deployed contract.
 *
 * @beta
 */
export interface GenericContractInfo extends DeployedContract {
  sourceName: string;
  abi: Abi;
}

/**
 * The result of requesting the status of a deployment. It lists the futures
 * broken down by their status, and includes the deployed contracts.
 *
 * @beta
 */
export interface StatusResult
  extends Omit<ExecutionErrorDeploymentResult, "type"> {
  chainId: number;
  contracts: {
    [key: string]: GenericContractInfo;
  };
}
