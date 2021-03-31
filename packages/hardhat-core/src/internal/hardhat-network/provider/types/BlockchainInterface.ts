import { Block } from "@ethereumjs/block";
import { TypedTransaction } from "@ethereumjs/tx";
import { BN } from "ethereumjs-util";

import { FilterParams } from "../node-types";
import { RpcLogOutput, RpcReceiptOutput } from "../output";

// TODO: Replace this with BlockchainInterface from @ethereumjs/blockchain
export interface BlockchainInterface {
  getLatestBlock(): Promise<Block>;
  getBlock(blockHashOrNumber: Buffer | number | BN): Promise<Block | undefined>;
  addBlock(block: Block): Promise<Block>;
  deleteBlock(blockHash: Buffer): void;
  deleteLaterBlocks(block: Block): void;
  getTotalDifficulty(blockHash: Buffer): Promise<BN>;
  getTransaction(
    transactionHash: Buffer
  ): Promise<TypedTransaction | undefined>;
  getLocalTransaction(transactionHash: Buffer): TypedTransaction | undefined;
  getBlockByTransactionHash(
    transactionHash: Buffer
  ): Promise<Block | undefined>;
  getTransactionReceipt(
    transactionHash: Buffer
  ): Promise<RpcReceiptOutput | undefined>;
  addTransactionReceipts(receipts: RpcReceiptOutput[]): void;
  getLogs(filterParams: FilterParams): Promise<RpcLogOutput[]>;
}
