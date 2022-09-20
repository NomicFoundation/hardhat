import { Block } from "@nomicfoundation/ethereumjs-block";
import { BlockchainInterface } from "@nomicfoundation/ethereumjs-blockchain";

import { FilterParams } from "../node-types";
import { RpcLogOutput, RpcReceiptOutput } from "../output";

export interface HardhatBlockchainInterface extends BlockchainInterface {
  addTransactionReceipts(receipts: RpcReceiptOutput[]): void;
  reserveBlocks(
    count: bigint,
    interval: bigint,
    previousBlockStateRoot: Buffer,
    previousBlockTotalDifficulty: bigint,
    previousBlockBaseFeePerGas: bigint | undefined
  ): void;
  deleteLaterBlocks(block: Block): void;
  getBlockByTransactionHash(transactionHash: Buffer): Promise<Block | null>;
  getLatestBlock(): Promise<Block>;
  getLatestBlockNumber(): bigint;
  getLogs(filterParams: FilterParams): Promise<RpcLogOutput[]>;
  getTotalDifficulty(blockHash: Buffer): Promise<bigint>;
  getTransactionReceipt(
    transactionHash: Buffer
  ): Promise<RpcReceiptOutput | null>;
}
