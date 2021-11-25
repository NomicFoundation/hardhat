import { Block } from "@ethereumjs/block";
import { RunBlockResult } from "@ethereumjs/vm/dist/runBlock";
import { BN } from "ethereumjs-util";

import { HARDHAT_MEMPOOL_SUPPORTED_ORDERS } from "../../constants";
import { BuildInfo, HardhatNetworkChainsConfig } from "../../../types";
import { MessageTrace } from "../stack-traces/message-trace";

import type { ReturnData } from "./return-data";

export type NodeConfig = LocalNodeConfig | ForkedNodeConfig;

export function isForkedNodeConfig(
  config: NodeConfig
): config is ForkedNodeConfig {
  return "forkConfig" in config && config.forkConfig !== undefined;
}

interface CommonConfig {
  automine: boolean;
  blockGasLimit: number;
  chainId: number;
  genesisAccounts: GenesisAccount[];
  hardfork: string;
  minGasPrice: BN;
  networkId: number;
  networkName: string;
  allowUnlimitedContractSize?: boolean;
  initialDate?: Date;
  tracingConfig?: TracingConfig;
  initialBaseFeePerGas?: number;
  mempoolOrder: MempoolOrder;
  coinbase: string;
  chains: HardhatNetworkChainsConfig;
}

export type LocalNodeConfig = CommonConfig;

export interface ForkConfig {
  jsonRpcUrl: string;
  blockNumber?: number;
}

export interface ForkedNodeConfig extends CommonConfig {
  forkConfig: ForkConfig;
  forkCachePath?: string;
}

export interface TracingConfig {
  buildInfos?: BuildInfo[];
}

export type IntervalMiningConfig = number | [number, number];

export type MempoolOrder = typeof HARDHAT_MEMPOOL_SUPPORTED_ORDERS[number];

export interface GenesisAccount {
  privateKey: string;
  balance: string | number | BN;
}

export type AccessListBufferItem = [Buffer, Buffer[]];

export interface CallParams {
  to?: Buffer;
  from: Buffer;
  gasLimit: BN;
  value: BN;
  data: Buffer;
  // We use this access list format because @ethereumjs/tx access list data
  // forces us to use it or stringify them
  accessList?: AccessListBufferItem[];
  // Fee params
  gasPrice?: BN;
  maxFeePerGas?: BN;
  maxPriorityFeePerGas?: BN;
}

export type TransactionParams =
  | LegacyTransactionParams
  | AccessListTransactionParams
  | EIP1559TransactionParams;

interface BaseTransactionParams {
  // `to` should be undefined for contract creation
  to?: Buffer;
  from: Buffer;
  gasLimit: BN;
  value: BN;
  data: Buffer;
  nonce: BN;
}

export interface LegacyTransactionParams extends BaseTransactionParams {
  gasPrice: BN;
}

export interface AccessListTransactionParams extends BaseTransactionParams {
  gasPrice: BN;
  // We use this access list format because @ethereumjs/tx access list data
  // forces us to use it or stringify them
  accessList: AccessListBufferItem[];
  // We don't include chainId as it's not necessary, the node
  // already knows its chainId, and the Eth module must validate it
}

export interface EIP1559TransactionParams extends BaseTransactionParams {
  accessList: AccessListBufferItem[];
  maxFeePerGas: BN;
  maxPriorityFeePerGas: BN;
}

export interface FilterParams {
  fromBlock: BN;
  toBlock: BN;
  addresses: Buffer[];
  normalizedTopics: Array<Array<Buffer | null> | null>;
}

export interface Snapshot {
  id: number;
  date: Date;
  latestBlock: Block;
  stateRoot: Buffer;
  txPoolSnapshotId: number;
  blockTimeOffsetSeconds: BN;
  nextBlockTimestamp: BN;
  irregularStatesByBlockNumber: Map<string, Buffer>;
  userProvidedNextBlockBaseFeePerGas: BN | undefined;
  coinbase: string;
}

export type SendTransactionResult =
  | string
  | MineBlockResult
  | MineBlockResult[];

export interface MineBlockResult {
  block: Block;
  blockResult: RunBlockResult;
  traces: GatherTracesResult[];
}

export interface RunCallResult extends GatherTracesResult {
  result: ReturnData;
}

export interface EstimateGasResult extends GatherTracesResult {
  estimation: BN;
}

export interface GatherTracesResult {
  trace: MessageTrace | undefined;
  error?: Error;
  consoleLogMessages: string[];
}

export interface FeeHistory {
  oldestBlock: BN;
  baseFeePerGas: BN[];
  gasUsedRatio: number[];
  reward?: BN[][];
}
