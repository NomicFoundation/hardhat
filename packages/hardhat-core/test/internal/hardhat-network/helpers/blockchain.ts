import { Transaction, TxData } from "@ethereumjs/tx";
import { Address, AddressLike, BN, bufferToHex } from "ethereumjs-util";

import { numberToRpcQuantity } from "../../../../src/internal/core/jsonrpc/types/base-types";
import { randomAddress } from "../../../../src/internal/hardhat-network/provider/fork/random";
import {
  RpcLogOutput,
  RpcReceiptOutput,
} from "../../../../src/internal/hardhat-network/provider/output";
import {
  OrderedTransaction,
  SerializedTransaction,
} from "../../../../src/internal/hardhat-network/provider/PoolState";
import { FakeSenderTransaction } from "../../../../src/internal/hardhat-network/provider/transactions/FakeSenderTransaction";
import { serializeTransaction } from "../../../../src/internal/hardhat-network/provider/TxPool";

export function createTestTransaction(data: TxData = {}) {
  return new Transaction({ to: randomAddress(), ...data });
}

export function createTestFakeTransaction(
  data: TxData & { from?: AddressLike } = {}
) {
  const from = data.from ?? randomAddress();
  const fromAddress = Buffer.isBuffer(from)
    ? new Address(from)
    : typeof from === "string"
    ? Address.fromString(from)
    : from;

  return new FakeSenderTransaction(fromAddress, {
    to: randomAddress(),
    nonce: new BN(1),
    gasLimit: 30000,
    ...data,
  });
}

interface OrderedTxData extends TxData {
  orderId: number;
  from?: AddressLike;
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
