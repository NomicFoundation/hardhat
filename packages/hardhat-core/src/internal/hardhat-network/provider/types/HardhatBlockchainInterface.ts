import { Block } from "@ethereumjs/block";
import { BlockchainInterface } from "@ethereumjs/blockchain";
import { BN } from "ethereumjs-util";

import { FilterParams } from "../node-types";
import { RpcLogOutput, RpcReceiptOutput } from "../output";

export interface HardhatBlockchainInterface extends BlockchainInterface {
  addBlockRange(blocks: number, interval: number): void;
  addTransactionReceipts(receipts: RpcReceiptOutput[]): void;
  deleteLaterBlocks(block: Block): void;
  getBlockByTransactionHash(transactionHash: Buffer): Promise<Block | null>;
  getLatestBlock(): Promise<Block>;
  getLogs(filterParams: FilterParams): Promise<RpcLogOutput[]>;
  getTotalDifficulty(blockHash: Buffer): Promise<BN>;
  getTransactionReceipt(
    transactionHash: Buffer
  ): Promise<RpcReceiptOutput | null>;
}
