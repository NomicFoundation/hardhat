import { Abi } from "./artifact";

/**
 * The information of a deployed contract.
 *
 * @beta
 */
export interface GenericContractInfo {
  [futureId: string]: {
    contractName: string;
    sourceName: string;
    address: string;
    abi: Abi;
  };
}

/**
 * The result of requesting a list of the deployments. It lists the deployments by their IDs,
 * and includes the deployed contracts of each.
 *
 * @beta
 */
export interface ListResult {
  [deploymentId: string]: {
    chainId: number;
  } & GenericContractInfo;
}
