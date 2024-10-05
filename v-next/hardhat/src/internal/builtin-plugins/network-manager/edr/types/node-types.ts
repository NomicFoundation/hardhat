import type { HardhatNetworkChainsConfig } from "./config.js";
import type { BuildInfo } from "../../../../../types/artifacts.js";
import type { HARDHAT_MEMPOOL_SUPPORTED_ORDERS } from "../../../../constants.js";
import type { ForkConfig } from "@nomicfoundation/edr";

export type NodeConfig = LocalNodeConfig | ForkedNodeConfig;

interface CommonConfig {
  automine: boolean;
  blockGasLimit: number;
  chainId: number;
  genesisAccounts: GenesisAccount[];
  hardfork: string;
  minGasPrice: bigint;
  networkId: number;
  allowUnlimitedContractSize?: boolean;
  initialDate?: Date;
  tracingConfig?: TracingConfig;
  initialBaseFeePerGas?: number;
  mempoolOrder: MempoolOrder;
  coinbase: string;
  chains: HardhatNetworkChainsConfig;
  allowBlocksWithSameTimestamp: boolean;
  enableTransientStorage: boolean;
}

export type LocalNodeConfig = CommonConfig;

export interface ForkedNodeConfig extends CommonConfig {
  forkConfig: ForkConfig;
  forkCachePath?: string;
}

export interface TracingConfig {
  buildInfos?: BuildInfo[];
  ignoreContracts?: boolean;
}

export type IntervalMiningConfig = number | [number, number];

export type MempoolOrder = (typeof HARDHAT_MEMPOOL_SUPPORTED_ORDERS)[number];

export interface GenesisAccount {
  privateKey: string;
  balance: string | number | bigint;
}
