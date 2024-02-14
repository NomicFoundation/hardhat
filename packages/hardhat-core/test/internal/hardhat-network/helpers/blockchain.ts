import {
  AccessListEIP2930TxData,
  FeeMarketEIP1559TxData,
  LegacyTransaction as Transaction,
  LegacyTxData as TxData,
} from "@nomicfoundation/ethereumjs-tx";
import {
  Address,
  AddressLike,
  bytesToHex as bufferToHex,
  toBytes,
} from "@nomicfoundation/ethereumjs-util";

import { numberToRpcQuantity } from "../../../../src/internal/core/jsonrpc/types/base-types";
import { randomAddress } from "../../../../src/internal/hardhat-network/provider/utils/random";
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
import { DEFAULT_ACCOUNTS } from "./providers";

function toBuffer(x: Parameters<typeof toBytes>[0]) {
  return Buffer.from(toBytes(x));
}

export function createTestTransaction(data: TxData = {}) {
  const tx = new Transaction({ to: randomAddress(), ...data });

  return tx.sign(toBuffer(DEFAULT_ACCOUNTS[0].privateKey));
}

export function createUnsignedTestTransaction(data: TxData = {}) {
  const tx = new Transaction({ to: randomAddress(), ...data });

  return tx;
}

export function createTestFakeTransaction(
  data: (TxData | FeeMarketEIP1559TxData | AccessListEIP2930TxData) & {
    from?: AddressLike;
  } = {}
) {
  const from = data.from ?? randomAddress();
  const fromAddress =
    from instanceof Uint8Array
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
      ? data.type
      : "maxFeePerGas" in data || "maxPriorityFeePerGas" in data
      ? 2n
      : "accessList" in data
      ? 1n
      : 0n;

  const dataWithDefaults = {
    to: randomAddress(),
    nonce: 1,
    gasLimit: 30000,
    ...data,
  };

  if (type === 0n) {
    return new FakeSenderTransaction(fromAddress, dataWithDefaults);
  }

  if (type === 1n) {
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

export function createTestLog(blockNumber: bigint): RpcLogOutput {
  const log: any = {
    address: randomAddress(),
    blockNumber: numberToRpcQuantity(blockNumber),
    // we ignore other properties for test purposes
  };
  return log;
}
