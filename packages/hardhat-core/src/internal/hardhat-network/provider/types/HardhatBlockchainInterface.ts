import { BlockchainInterface } from "@nomicfoundation/ethereumjs-blockchain";

import { RpcReceiptOutput } from "../output";
import { BlockchainAdapter } from "../blockchain";

export interface HardhatBlockchainInterface
  extends BlockchainInterface,
    BlockchainAdapter {
  addTransactionReceipts(receipts: RpcReceiptOutput[]): void;
}
