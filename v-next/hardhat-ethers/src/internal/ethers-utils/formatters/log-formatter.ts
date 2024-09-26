import type { LogParams } from "ethers";

import { getAddress, getNumber } from "ethers";

import {
  arrayOf,
  formatBoolean,
  formatData,
  formatHash,
  object,
} from "../helpers.js";

export function formatLog(value: any): LogParams {
  return _formatLog(value);
}

const _formatLog = object(
  {
    address: getAddress,
    blockHash: formatHash,
    blockNumber: getNumber,
    data: formatData,
    index: getNumber,
    removed: formatBoolean,
    topics: arrayOf(formatHash),
    transactionHash: formatHash,
    transactionIndex: getNumber,
  },
  {
    index: ["logIndex"],
  },
);
