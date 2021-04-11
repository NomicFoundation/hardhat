import { Block } from "@ethereumjs/block";
import { RunBlockResult } from "@ethereumjs/vm/dist/runBlock";
import { BN } from "ethereumjs-util";

import { BuildInfo } from "../../../types";
import { MessageTrace } from "../stack-traces/message-trace";

export type NodeConfig = LocalNodeConfig | ForkedNodeConfig;

interface CommonConfig {
  automine: boolean;
  blockGasLimit: number;
  chainId: number;
  genesisAccounts: GenesisAccount[];
  hardfork: string;
  networkId: number;
  networkName: string;
  allowUnlimitedContractSize?: boolean;
  initialDate?: Date;
  tracingConfig?: TracingConfig;
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

export interface GenesisAccount {
  privateKey: string;
  balance: string | number | BN;
}

export type AccessListBufferItem = [Buffer, Buffer[]];

export interface CallParams {
  to?: Buffer;
  from: Buffer;
  gasLimit: BN;
  gasPrice: BN;
  value: BN;
  data: Buffer;
  // We use this access list format because @ethereumjs/tx access list data
  // forces us to use it or stringify them
  accessList?: AccessListBufferItem[];
}

export interface TransactionParams {
  // `to` should be undefined for contract creation
  to?: Buffer;
  from: Buffer;
  gasLimit: BN;
  gasPrice: BN;
  value: BN;
  data: Buffer;
  nonce: BN;
  // We use this access list format because @ethereumjs/tx access list data
  // forces us to use it or stringify them
  accessList?: AccessListBufferItem[];
  // We don't include chainId as it's not necessary, the node
  // already knows its chainId, and the Eth module must validate it
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
  result: Buffer;
}

export interface EstimateGasResult extends GatherTracesResult {
  estimation: BN;
}

export interface GatherTracesResult {
  trace: MessageTrace | undefined;
  error?: Error;
  consoleLogMessages: string[];
}
