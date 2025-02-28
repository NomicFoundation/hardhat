import {
  LegacyTransaction as Transaction,
  LegacyTxData as TxData,
} from "@ethereumjs/tx";
import { bytesToHex, toBytes } from "@ethereumjs/util";

import { numberToRpcQuantity } from "../../../../src/internal/core/jsonrpc/types/base-types";
import { randomAddress } from "../../../../src/internal/hardhat-network/provider/utils/random";
import {
  RpcLogOutput,
  RpcReceiptOutput,
} from "../../../../src/internal/hardhat-network/provider/output";
import { DEFAULT_ACCOUNTS } from "./providers";

export function createTestTransaction(data: TxData = {}) {
  const tx = new Transaction({ to: randomAddress(), ...data });

  return tx.sign(toBytes(DEFAULT_ACCOUNTS[0].privateKey));
}

export function createTestReceipt(
  transaction: Transaction,
  logs: RpcLogOutput[] = []
): RpcReceiptOutput {
  const receipt: any = {
    transactionHash: bytesToHex(transaction.hash()),
    logs,
    // we ignore other properties for test purposes
  };
  return receipt;
}

export function createTestLog(blockNumber: bigint): RpcLogOutput {
  const log: any = {
    address: randomAddress(),
    blockNumber: numberToRpcQuantity(blockNumber),
    // we ignore other properties for test purposes
  };
  return log;
}
