/// <reference types="node" />
import { Block } from "@ethereumjs/block";
import { TypedTransaction } from "@ethereumjs/tx";
import { BN } from "ethereumjs-util";
import { FilterParams } from "./node-types";
import { RpcLogOutput, RpcReceiptOutput } from "./output";
import { HardhatBlockchainInterface } from "./types/HardhatBlockchainInterface";
export declare class HardhatBlockchain implements HardhatBlockchainInterface {
    private readonly _data;
    private _length;
    getLatestBlock(): Promise<Block>;
    getBlock(blockHashOrNumber: Buffer | BN | number): Promise<Block | null>;
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
    getLogs(filterParams: FilterParams): Promise<RpcLogOutput[]>;
    iterator(_name: string, _onBlock: (block: Block, reorg: boolean) => void | Promise<void>): Promise<number | void>;
    getBaseFee(): Promise<BN>;
    private _validateBlock;
    private _computeTotalDifficulty;
    private _delBlock;
}
//# sourceMappingURL=HardhatBlockchain.d.ts.map