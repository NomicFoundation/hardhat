import { BN } from "ethereumjs-util";

import { BuildInfo } from "../../../types";

import { Block } from "./types/Block";

export type NodeConfig = LocalNodeConfig | ForkedNodeConfig;

interface CommonConfig {
  blockGasLimit: number;
  genesisAccounts: GenesisAccount[];
  automine: boolean;
  allowUnlimitedContractSize?: boolean;
  tracingConfig?: TracingConfig;
}

export interface LocalNodeConfig extends CommonConfig {
  type: "local";
  hardfork: string;
  networkName: string;
  chainId: number;
  networkId: number;
  initialDate?: Date;
}

export interface ForkConfig {
  jsonRpcUrl: string;
  blockNumber?: number;
}

export interface ForkedNodeConfig extends CommonConfig {
  type: "forked";
  forkConfig: ForkConfig;
  forkCachePath?: string;
}

export interface TracingConfig {
  buildInfos?: BuildInfo[];
}

export interface GenesisAccount {
  privateKey: string;
  balance: string | number | BN;
}

export interface CallParams {
  to: Buffer;
  from: Buffer;
  gasLimit: BN;
  gasPrice: BN;
  value: BN;
  data: Buffer;
}

export interface TransactionParams {
  to: Buffer;
  from: Buffer;
  gasLimit: BN;
  gasPrice: BN;
  value: BN;
  data: Buffer;
  nonce: BN;
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
  blockTimeOffsetSeconds: BN;
  nextBlockTimestamp: BN;
}
