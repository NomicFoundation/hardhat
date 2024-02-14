import { Block } from "@nomicfoundation/ethereumjs-block";
import { BlockchainInterface } from "@nomicfoundation/ethereumjs-blockchain";

import { FilterParams } from "../node-types";
import { RpcLogOutput, RpcReceiptOutput } from "../output";

export interface HardhatBlockchainInterface extends BlockchainInterface {
  addTransactionReceipts(receipts: RpcReceiptOutput[]): void;
  reserveBlocks(
    count: bigint,
    interval: bigint,
    previousBlockStateRoot: Uint8Array,
    previousBlockTotalDifficulty: bigint,
    previousBlockBaseFeePerGas: bigint | undefined
  ): void;
  deleteLaterBlocks(block: Block): void;
  getBlockByTransactionHash(transactionHash: Uint8Array): Promise<Block | null>;
  getLatestBlock(): Promise<Block>;
  getLatestBlockNumber(): bigint;
  getLogs(filterParams: FilterParams): Promise<RpcLogOutput[]>;
  getTotalDifficulty(blockHash: Uint8Array): Promise<bigint>;
  getTransactionReceipt(
    transactionHash: Uint8Array
  ): Promise<RpcReceiptOutput | null>;
}
