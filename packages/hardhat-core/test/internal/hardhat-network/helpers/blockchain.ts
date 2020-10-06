import { FakeTransaction, FakeTxData, Transaction } from "ethereumjs-tx";
import { BN, bufferToHex } from "ethereumjs-util";

import { randomAddressBuffer } from "../../../../src/internal/hardhat-network/provider/fork/random";
import {
  numberToRpcQuantity,
  RpcLogOutput,
  RpcReceiptOutput,
} from "../../../../src/internal/hardhat-network/provider/output";

export function createTestTransaction() {
  return new Transaction({ to: randomAddressBuffer() });
}

export function createTestFakeTransaction(data: FakeTxData = {}) {
  return new FakeTransaction({
    to: randomAddressBuffer(),
    from: randomAddressBuffer(),
    nonce: 1,
    ...data,
  });
}

export function createTestReceipt(
  transaction: Transaction,
  logs: RpcLogOutput[] = []
): RpcReceiptOutput {
  const receipt: any = {
    transactionHash: bufferToHex(transaction.hash()),
    logs,
    // we ignore other properties for test purposes
  };
  return receipt;
}

export function createTestLog(blockNumber: BN | number): RpcLogOutput {
  const log: any = {
    address: randomAddressBuffer(),
    blockNumber: numberToRpcQuantity(blockNumber),
    // we ignore other properties for test purposes
  };
  return log;
}
