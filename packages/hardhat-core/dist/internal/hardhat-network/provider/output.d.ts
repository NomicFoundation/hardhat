import { Block } from "@ethereumjs/block";
import Common from "@ethereumjs/common";
import { TypedTransaction } from "@ethereumjs/tx";
import { RunBlockResult } from "@ethereumjs/vm/dist/runBlock";
import { BN } from "ethereumjs-util";
import { RpcLog } from "../../core/jsonrpc/types/output/log";
import { RpcTransactionReceipt } from "../../core/jsonrpc/types/output/receipt";
export interface RpcBlockOutput {
    difficulty: string;
    extraData: string;
    gasLimit: string;
    gasUsed: string;
    hash: string | null;
    logsBloom: string | null;
    miner: string;
    mixHash: string | null;
    nonce: string | null;
    number: string | null;
    parentHash: string;
    receiptsRoot: string;
    sha3Uncles: string;
    size: string;
    stateRoot: string;
    timestamp: string;
    totalDifficulty: string;
    transactions: string[] | RpcTransactionOutput[];
    transactionsRoot: string;
    uncles: string[];
    baseFeePerGas?: string;
}
export declare type RpcTransactionOutput = LegacyRpcTransactionOutput | AccessListEIP2930RpcTransactionOutput | EIP1559RpcTransactionOutput;
interface BaseRpcTransactionOutput {
    blockHash: string | null;
    blockNumber: string | null;
    from: string;
    gas: string;
    hash: string;
    input: string;
    nonce: string;
    r: string;
    s: string;
    to: string | null;
    transactionIndex: string | null;
    v: string;
    value: string;
    type?: string;
}
export interface LegacyRpcTransactionOutput extends BaseRpcTransactionOutput {
    gasPrice: string;
}
export declare type RpcAccessListOutput = Array<{
    address: string;
    storageKeys: string[];
}>;
export interface AccessListEIP2930RpcTransactionOutput extends BaseRpcTransactionOutput {
    gasPrice: string;
    accessList?: RpcAccessListOutput;
    chainId: string;
}
export interface EIP1559RpcTransactionOutput extends BaseRpcTransactionOutput {
    gasPrice: string;
    maxFeePerGas: string;
    maxPriorityFeePerGas: string;
    accessList?: RpcAccessListOutput;
    chainId: string;
}
export interface RpcReceiptOutput {
    blockHash: string;
    blockNumber: string;
    contractAddress: string | null;
    cumulativeGasUsed: string;
    from: string;
    gasUsed: string;
    logs: RpcLogOutput[];
    logsBloom: string;
    to: string | null;
    transactionHash: string;
    transactionIndex: string;
    status?: string;
    root?: string;
    type?: string;
    effectiveGasPrice?: string;
}
export interface RpcLogOutput {
    address: string;
    blockHash: string | null;
    blockNumber: string | null;
    data: string;
    logIndex: string | null;
    removed: boolean;
    topics: string[];
    transactionHash: string | null;
    transactionIndex: string | null;
}
export interface RpcStructLog {
    depth: number;
    gas: number;
    gasCost: number;
    op: string;
    pc: number;
    memory?: string[];
    stack?: string[];
    storage?: Record<string, string>;
    memSize?: number;
    error?: object;
}
export interface RpcDebugTraceOutput {
    failed: boolean;
    gas: number;
    returnValue: string;
    structLogs: RpcStructLog[];
}
export declare function getRpcBlock(block: Block, totalDifficulty: BN, showTransactionType: boolean, includeTransactions?: boolean, pending?: boolean): RpcBlockOutput;
export declare function getRpcTransaction(tx: TypedTransaction, showTransactionType: boolean, block: Block, index: number): RpcTransactionOutput;
export declare function getRpcTransaction(tx: TypedTransaction, showTransactionType: boolean, block: "pending"): RpcTransactionOutput;
export declare function getRpcReceiptOutputsFromLocalBlockExecution(block: Block, runBlockResult: RunBlockResult, showTransactionType: boolean): RpcReceiptOutput[];
export declare function remoteReceiptToRpcReceiptOutput(receipt: RpcTransactionReceipt, tx: TypedTransaction, showTransactionType: boolean, showEffectiveGasPrice: boolean): RpcReceiptOutput;
export declare function toRpcLogOutput(log: RpcLog): RpcLogOutput;
export declare function shouldShowTransactionTypeForHardfork(common: Common): boolean;
export declare function shouldShowEffectiveGasPriceForHardfork(common: Common): boolean;
export {};
//# sourceMappingURL=output.d.ts.map