/// <reference types="node" />
import { Block } from "@ethereumjs/block";
import { RunBlockResult } from "@ethereumjs/vm/dist/runBlock";
import { BN } from "ethereumjs-util";
import { HARDHAT_MEMPOOL_SUPPORTED_ORDERS } from "../../constants";
import { BuildInfo, HardhatNetworkChainsConfig } from "../../../types";
import { MessageTrace } from "../stack-traces/message-trace";
import type { ReturnData } from "./return-data";
export declare type NodeConfig = LocalNodeConfig | ForkedNodeConfig;
export declare function isForkedNodeConfig(config: NodeConfig): config is ForkedNodeConfig;
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
export declare type LocalNodeConfig = CommonConfig;
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
export declare type IntervalMiningConfig = number | [number, number];
export declare type MempoolOrder = typeof HARDHAT_MEMPOOL_SUPPORTED_ORDERS[number];
export interface GenesisAccount {
    privateKey: string;
    balance: string | number | BN;
}
export declare type AccessListBufferItem = [Buffer, Buffer[]];
export interface CallParams {
    to?: Buffer;
    from: Buffer;
    gasLimit: BN;
    value: BN;
    data: Buffer;
    accessList?: AccessListBufferItem[];
    gasPrice?: BN;
    maxFeePerGas?: BN;
    maxPriorityFeePerGas?: BN;
}
export declare type TransactionParams = LegacyTransactionParams | AccessListTransactionParams | EIP1559TransactionParams;
interface BaseTransactionParams {
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
    accessList: AccessListBufferItem[];
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
export declare type SendTransactionResult = string | MineBlockResult | MineBlockResult[];
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
export {};
//# sourceMappingURL=node-types.d.ts.map