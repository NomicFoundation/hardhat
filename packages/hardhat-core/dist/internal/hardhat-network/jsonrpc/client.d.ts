/// <reference types="node" />
import { Address, BN } from "ethereumjs-util";
import { RpcBlock, RpcBlockWithTransactions } from "../../core/jsonrpc/types/output/block";
import { HttpProvider } from "../../core/providers/http";
export declare class JsonRpcClient {
    private _httpProvider;
    private _networkId;
    private _latestBlockNumberOnCreation;
    private _maxReorg;
    private _forkCachePath?;
    private _cache;
    constructor(_httpProvider: HttpProvider, _networkId: number, _latestBlockNumberOnCreation: number, _maxReorg: number, _forkCachePath?: string | undefined);
    getNetworkId(): number;
    getDebugTraceTransaction(transactionHash: Buffer): Promise<any>;
    getStorageAt(address: Address, position: BN, blockNumber: BN): Promise<Buffer>;
    getBlockByNumber(blockNumber: BN, includeTransactions?: false): Promise<RpcBlock | null>;
    getBlockByNumber(blockNumber: BN, includeTransactions: true): Promise<RpcBlockWithTransactions | null>;
    getBlockByHash(blockHash: Buffer, includeTransactions?: false): Promise<RpcBlock | null>;
    getBlockByHash(blockHash: Buffer, includeTransactions: true): Promise<RpcBlockWithTransactions | null>;
    getTransactionByHash(transactionHash: Buffer): Promise<{
        blockHash: Buffer | null;
        blockNumber: BN | null;
        from: Buffer;
        gas: BN;
        gasPrice: BN;
        hash: Buffer;
        input: Buffer;
        nonce: BN;
        to: Buffer | null | undefined;
        transactionIndex: BN | null;
        value: BN;
        v: BN;
        r: BN;
        s: BN;
        type: BN | undefined;
        chainId: BN | null | undefined;
        accessList: {
            address: Buffer;
            storageKeys: Buffer[] | null;
        }[] | undefined;
        maxFeePerGas: BN | undefined;
        maxPriorityFeePerGas: BN | undefined;
    } | null>;
    getTransactionCount(address: Buffer, blockNumber: BN): Promise<BN>;
    getTransactionReceipt(transactionHash: Buffer): Promise<{
        transactionHash: Buffer;
        transactionIndex: BN;
        blockHash: Buffer;
        blockNumber: BN;
        from: Buffer;
        to: Buffer | null;
        cumulativeGasUsed: BN;
        gasUsed: BN;
        contractAddress: Buffer | null;
        logs: {
            logIndex: BN | null;
            transactionIndex: BN | null;
            transactionHash: Buffer | null;
            blockHash: Buffer | null;
            blockNumber: BN | null;
            address: Buffer;
            data: Buffer;
            topics: Buffer[];
        }[];
        logsBloom: Buffer;
        status: BN | null | undefined;
        root: Buffer | undefined;
        type: BN | undefined;
        effectiveGasPrice: BN | undefined;
    } | null>;
    getLogs(options: {
        fromBlock: BN;
        toBlock: BN;
        address?: Buffer | Buffer[];
        topics?: Array<Array<Buffer | null> | null>;
    }): Promise<{
        logIndex: BN | null;
        transactionIndex: BN | null;
        transactionHash: Buffer | null;
        blockHash: Buffer | null;
        blockNumber: BN | null;
        address: Buffer;
        data: Buffer;
        topics: Buffer[];
    }[]>;
    getAccountData(address: Address, blockNumber: BN): Promise<{
        code: Buffer;
        transactionCount: BN;
        balance: BN;
    }>;
    private _perform;
    private _performBatch;
    private _send;
    private _sendBatch;
    private _shouldRetry;
    private _getCacheKey;
    private _getBatchCacheKey;
    private _getFromCache;
    private _storeInCache;
    private _getFromDiskCache;
    private _getBatchFromDiskCache;
    private _getRawFromDiskCache;
    private _storeInDiskCache;
    private _getDiskCachePathForKey;
    private _canBeCached;
    private _canBeReorgedOut;
}
//# sourceMappingURL=client.d.ts.map