// these helpers functions were copied from ethers

import type { PreparedTransactionRequest, TransactionRequest } from "ethers";

import { accessListify, getBigInt, getNumber, hexlify } from "ethers";

export function copyRequest(
  req: TransactionRequest,
): PreparedTransactionRequest {
  const result: any = {};

  // These could be addresses, ENS names or Addressables
  if (req.to !== null && req.to !== undefined) {
    result.to = req.to;
  }
  if (req.from !== null && req.from !== undefined) {
    result.from = req.from;
  }

  if (req.data !== null && req.data !== undefined) {
    result.data = hexlify(req.data);
  }

  const bigIntKeys: Array<keyof TransactionRequest> = [
    "chainId",
    "gasLimit",
    "gasPrice",
    "maxFeePerGas",
    "maxPriorityFeePerGas",
    "value",
  ];

  for (const key of bigIntKeys) {
    if (!(key in req) || req[key] === null || req[key] === undefined) {
      continue;
    }
    result[key] = getBigInt(req[key], `request.${key}`);
  }

  const numberKeys: Array<keyof TransactionRequest> = ["type", "nonce"];

  for (const key of numberKeys) {
    if (!(key in req) || req[key] === null || req[key] === undefined) {
      continue;
    }
    result[key] = getNumber(req[key], `request.${key}`);
  }

  if (req.accessList !== null && req.accessList !== undefined) {
    result.accessList = accessListify(req.accessList);
  }

  if ("blockTag" in req) {
    result.blockTag = req.blockTag;
  }

  if ("enableCcipRead" in req) {
    result.enableCcipReadEnabled = Boolean(req.enableCcipRead);
  }

  if ("customData" in req) {
    result.customData = req.customData;
  }

  return result;
}
