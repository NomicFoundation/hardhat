import type { ModuleDict } from "./module";

/**
 * The details of a deployed contract. The combination of address and abi
 * should allow a consumer to call the contract.
 *
 * @internal
 */
export interface ContractInfo {
  name: string;
  address: string;
  abi: any[];
}

/**
 * The contract details from a successful deployment.
 *
 * @internal
 */
export type SerializedDeploymentResult<T extends ModuleDict> = {
  [K in keyof T]: ContractInfo;
};
