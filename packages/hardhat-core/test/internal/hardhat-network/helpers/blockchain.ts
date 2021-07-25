import { Transaction, TxData } from "@ethereumjs/tx";
import {
  Address,
  AddressLike,
  BN,
  bufferToHex,
  toBuffer,
} from "ethereumjs-util";

import { FeeMarketEIP1559TxData } from "@ethereumjs/tx/dist.browser";
import { AccessListEIP2930TxData } from "@ethereumjs/tx/dist/types";
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
import { FakeSenderAccessListEIP2930Transaction } from "../../../../src/internal/hardhat-network/provider/transactions/FakeSenderAccessListEIP2930Transaction";
import { FakeSenderEIP1559Transaction } from "../../../../src/internal/hardhat-network/provider/transactions/FakeSenderEIP1559Transaction";

export function createTestTransaction(data: TxData = {}) {
  return new Transaction({ to: randomAddress(), ...data });
}

export function createTestFakeTransaction(
  data: (TxData | FeeMarketEIP1559TxData | AccessListEIP2930TxData) & {
    from?: AddressLike;
  } = {}
) {
  const from = data.from ?? randomAddress();
  const fromAddress = Buffer.isBuffer(from)
    ? new Address(from)
    : typeof from === "string"
    ? Address.fromString(from)
    : from;

  if (
    "gasPrice" in data &&
    ("maxFeePerGas" in data || "maxPriorityFeePerGas" in data)
  ) {
    throw new Error(
      "Invalid test fake transaction being created: both gasPrice and EIP-1559 params received"
    );
  }

  if ("maxFeePerGas" in data !== "maxPriorityFeePerGas" in data) {
    throw new Error(
      "Invalid test fake transaction being created: both EIP-1559 params should be provided, or none of them"
    );
  }

  const type =
    data.type !== undefined
      ? new BN(toBuffer(data.type))
      : "maxFeePerGas" in data || "maxPriorityFeePerGas" in data
      ? new BN(2)
      : "accessList" in data
      ? new BN(1)
      : new BN(0);

  const dataWithDefaults = {
    to: randomAddress(),
    nonce: 1,
    gasLimit: 30000,
    ...data,
  };

  if (type.eqn(0)) {
    return new FakeSenderTransaction(fromAddress, dataWithDefaults);
  }

  if (type.eqn(1)) {
    return new FakeSenderAccessListEIP2930Transaction(
      fromAddress,
      dataWithDefaults
    );
  }

  return new FakeSenderEIP1559Transaction(fromAddress, {
    ...dataWithDefaults,
    gasPrice: undefined,
  });
}

type OrderedTxData = (
  | TxData
  | FeeMarketEIP1559TxData
  | AccessListEIP2930TxData
) & {
  from?: AddressLike;
  orderId: number;
};

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
