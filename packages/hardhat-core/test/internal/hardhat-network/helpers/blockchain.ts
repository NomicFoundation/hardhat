import Common from "@ethereumjs/common";
import { Transaction, TxData } from "@ethereumjs/tx";
import { Address, BN, bufferToHex } from "ethereumjs-util";

import { randomAddress } from "../../../../src/internal/hardhat-network/provider/fork/random";
import {
  numberToRpcQuantity,
  RpcLogOutput,
  RpcReceiptOutput,
} from "../../../../src/internal/hardhat-network/provider/output";
import {
  OrderedTransaction,
  SerializedTransaction,
} from "../../../../src/internal/hardhat-network/provider/PoolState";
import { serializeTransaction } from "../../../../src/internal/hardhat-network/provider/TxPool";

import { FakeTransaction, FakeTxData } from "./fakeTx";

export function createTestTransaction(data: TxData = {}) {
  return new Transaction({ to: randomAddress(), ...data });
}

export function createTestFakeTransaction(data: FakeTxData = {}) {
  return new FakeTransaction(
    {
      to: randomAddress(),
      from: randomAddress(),
      nonce: new BN(1),
      gasLimit: 30000,
      ...data,
    },
    { common: new Common({ chain: "mainnet" }) }
  );
}

interface OrderedTxData extends FakeTxData {
  orderId: number;
}

export function createTestOrderedTransaction({
  orderId,
  ...rest
}: OrderedTxData): OrderedTransaction {
  return {
    orderId,
    data: createTestFakeTransaction(rest),
  };
}

export function createTestSerializedTransaction(
  data: OrderedTxData
): SerializedTransaction {
  const tx = createTestOrderedTransaction(data);
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
    address: randomAddress(),
    blockNumber: numberToRpcQuantity(blockNumber),
    // we ignore other properties for test purposes
  };
  return log;
}
