import type { ReturnData } from "./return-data";

import { Block } from "@nomicfoundation/ethereumjs-block";
import { RunBlockResult } from "@nomicfoundation/ethereumjs-vm";

import { HARDHAT_MEMPOOL_SUPPORTED_ORDERS } from "../../constants";
import { BuildInfo, HardhatNetworkChainsConfig } from "../../../types";
import { MessageTrace } from "../stack-traces/message-trace";
import { RandomBufferGenerator } from "./utils/random";

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

export interface ForkConfig {
  jsonRpcUrl: string;
  blockNumber?: number;
  httpHeaders?: { [name: string]: string };
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
  balance: string | number | bigint;
}

export type AccessListBufferItem = [Buffer, Buffer[]];

export interface CallParams {
  to?: Buffer;
  from: Buffer;
  gasLimit: bigint;
  value: bigint;
  data: Buffer;
  // We use this access list format because @nomicfoundation/ethereumjs-tx access list data
  // forces us to use it or stringify them
  accessList?: AccessListBufferItem[];
  // Fee params
  gasPrice?: bigint;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
}

export type TransactionParams =
  | LegacyTransactionParams
  | AccessListTransactionParams
  | EIP1559TransactionParams;

interface BaseTransactionParams {
  // `to` should be undefined for contract creation
  to?: Buffer;
  from: Buffer;
  gasLimit: bigint;
  value: bigint;
  data: Buffer;
  nonce: bigint;
}

export interface LegacyTransactionParams extends BaseTransactionParams {
  gasPrice: bigint;
}

export interface AccessListTransactionParams extends BaseTransactionParams {
  gasPrice: bigint;
  // We use this access list format because @nomicfoundation/ethereumjs-tx access list data
  // forces us to use it or stringify them
  accessList: AccessListBufferItem[];
  // We don't include chainId as it's not necessary, the node
  // already knows its chainId, and the Eth module must validate it
}

export interface EIP1559TransactionParams extends BaseTransactionParams {
  accessList: AccessListBufferItem[];
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
}

export interface FilterParams {
  fromBlock: bigint;
  toBlock: bigint;
  addresses: Buffer[];
  normalizedTopics: Array<Array<Buffer | null> | null>;
}

export interface Snapshot {
  id: number;
  date: Date;
  latestBlock: Block;
  stateRoot: Buffer;
  txPoolSnapshotId: number;
  blockTimeOffsetSeconds: bigint;
  nextBlockTimestamp: bigint;
  irregularStatesByBlockNumber: Map<bigint, Buffer>;
  userProvidedNextBlockBaseFeePerGas: bigint | undefined;
  coinbase: string;
  mixHashGenerator: RandomBufferGenerator;
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
  estimation: bigint;
}

export interface GatherTracesResult {
  trace: MessageTrace | undefined;
  error?: Error;
  consoleLogMessages: string[];
}

export interface FeeHistory {
  oldestBlock: bigint;
  baseFeePerGas: bigint[];
  gasUsedRatio: number[];
  reward?: bigint[][];
}
