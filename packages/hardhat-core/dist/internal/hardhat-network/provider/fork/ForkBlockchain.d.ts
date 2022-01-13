/// <reference types="node" />
import { Block } from "@ethereumjs/block";
import Common from "@ethereumjs/common";
import { TypedTransaction } from "@ethereumjs/tx";
import { BN } from "ethereumjs-util";
import { JsonRpcClient } from "../../jsonrpc/client";
import { FilterParams } from "../node-types";
import { RpcLogOutput, RpcReceiptOutput } from "../output";
import { HardhatBlockchainInterface } from "../types/HardhatBlockchainInterface";
export declare class ForkBlockchain implements HardhatBlockchainInterface {
    private _jsonRpcClient;
    private _forkBlockNumber;
    private _common;
    private _data;
    private _latestBlockNumber;
    constructor(_jsonRpcClient: JsonRpcClient, _forkBlockNumber: BN, _common: Common);
    getLatestBlock(): Promise<Block>;
    getBlock(blockHashOrNumber: Buffer | number | BN): Promise<Block | null>;
    addBlock(block: Block): Promise<Block>;
    putBlock(block: Block): Promise<void>;
    deleteBlock(blockHash: Buffer): void;
    delBlock(blockHash: Buffer): Promise<void>;
    deleteLaterBlocks(block: Block): void;
    getTotalDifficulty(blockHash: Buffer): Promise<BN>;
    getTransaction(transactionHash: Buffer): Promise<TypedTransaction | undefined>;
    getLocalTransaction(transactionHash: Buffer): TypedTransaction | undefined;
    getBlockByTransactionHash(transactionHash: Buffer): Promise<Block | null>;
    getTransactionReceipt(transactionHash: Buffer): Promise<RpcReceiptOutput | null>;
    addTransactionReceipts(receipts: RpcReceiptOutput[]): void;
    getForkBlockNumber(): BN;
    getLogs(filterParams: FilterParams): Promise<RpcLogOutput[]>;
    iterator(_name: string, _onBlock: (block: Block, reorg: boolean) => void | Promise<void>): Promise<number | void>;
    getBaseFee(): Promise<BN>;
    private _getBlockByHash;
    private _getBlockByNumber;
    private _processRemoteBlock;
    private _computeTotalDifficulty;
    private _delBlock;
    private _processRemoteTransaction;
    private _processRemoteReceipt;
}
//# sourceMappingURL=ForkBlockchain.d.ts.map