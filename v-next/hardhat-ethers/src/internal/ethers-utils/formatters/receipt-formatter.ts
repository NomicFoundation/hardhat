import type { LogParams, TransactionReceiptParams } from "ethers";

import { getBigInt, getAddress, getNumber, hexlify } from "ethers";

import {
  allowNull,
  arrayOf,
  formatData,
  formatHash,
  object,
} from "../helpers.js";

export function formatReceiptLog(value: any): LogParams {
  return _formatReceiptLog(value);
}

const _formatReceiptLog = object(
  {
    transactionIndex: getNumber,
    blockNumber: getNumber,
    transactionHash: formatHash,
    address: getAddress,
    topics: arrayOf(formatHash),
    data: formatData,
    index: getNumber,
    blockHash: formatHash,
  },
  {
    index: ["logIndex"],
  },
);

export function formatTransactionReceipt(value: any): TransactionReceiptParams {
  return _formatTransactionReceipt(value);
}

const _formatTransactionReceipt = object(
  {
    to: allowNull(getAddress, null),
    from: allowNull(getAddress, null),
    contractAddress: allowNull(getAddress, null),
    index: getNumber,
    root: allowNull(hexlify),
    gasUsed: getBigInt,
    logsBloom: allowNull(formatData),
    blockHash: formatHash,
    hash: formatHash,
    logs: arrayOf(formatReceiptLog),
    blockNumber: getNumber,
    cumulativeGasUsed: getBigInt,
    effectiveGasPrice: allowNull(getBigInt),
    status: allowNull(getNumber),
    type: allowNull(getNumber, 0),
  },
  {
    effectiveGasPrice: ["gasPrice"],
    hash: ["transactionHash"],
    index: ["transactionIndex"],
  },
);
