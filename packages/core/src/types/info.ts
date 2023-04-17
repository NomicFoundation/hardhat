/**
 * A data structure describing a deployed Module
 *
 * @alpha
 */
export interface ModuleInfoData {
  moduleName: string;
  networks: NetworkInfoData[];
}

/**
 * A data structure describing network info for a deployed Module
 *
 * @alpha
 */
export interface NetworkInfoData {
  networkName: string;
  chainId: number;
  contracts: ContractInfoData[];
}

/**
 * A data structure describing a deployed Contract
 *
 * @alpha
 */
export interface ContractInfoData {
  contractName: string;
  status: string;
  address: string;
}
