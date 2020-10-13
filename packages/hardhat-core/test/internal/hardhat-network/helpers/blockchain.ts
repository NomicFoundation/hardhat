import {
  FakeTransaction,
  FakeTxData,
  Transaction,
  TxData,
} from "ethereumjs-tx";
import { BN, bufferToHex } from "ethereumjs-util";

import { randomAddressBuffer } from "../../../../src/internal/hardhat-network/provider/fork/random";
import {
  numberToRpcQuantity,
  RpcLogOutput,
  RpcReceiptOutput,
} from "../../../../src/internal/hardhat-network/provider/output";
import { serializeTransaction } from "../../../../src/internal/hardhat-network/provider/TransactionPool";

export function createTestTransaction(data: TxData = {}) {
  return new Transaction({ to: randomAddressBuffer(), ...data });
}

export function createTestFakeTransaction(data: FakeTxData = {}) {
  return new FakeTransaction({
    to: randomAddressBuffer(),
    from: randomAddressBuffer(),
    nonce: 1,
    gasLimit: 30000,
    ...data,
  });
}

export function createTestSerializedTransaction(data?: TxData) {
  const tx = createTestTransaction(data);
  return serializeTransaction(tx);
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
