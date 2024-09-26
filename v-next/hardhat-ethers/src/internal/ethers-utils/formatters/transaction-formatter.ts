import type { TransactionResponseParams } from "ethers";

import {
  accessListify,
  getAddress,
  getBigInt,
  getCreateAddress,
  getNumber,
  Signature,
} from "ethers";

import { allowNull, formatData, formatHash, object } from "../helpers.js";

export function formatTransactionResponse(
  value: any,
): TransactionResponseParams {
  // Some clients (TestRPC) do strange things like return 0x0 for the
  // 0 address; correct this to be a real address

  if (
    value.to !== null &&
    value.to !== undefined &&
    value.to !== "" &&
    getBigInt(value.to) === 0n
  ) {
    value.to = "0x0000000000000000000000000000000000000000";
  }

  const result = object(
    {
      hash: formatHash,

      type: (v: any) => {
        if (v === "0x" || v === null || v === undefined) {
          return 0;
        }
        return getNumber(v);
      },
      accessList: allowNull(accessListify, null),

      blockHash: allowNull(formatHash, null),
      blockNumber: allowNull(getNumber, null),
      transactionIndex: allowNull(getNumber, null),

      from: getAddress,

      // either (gasPrice) or (maxPriorityFeePerGas + maxFeePerGas) must be set
      gasPrice: allowNull(getBigInt),
      maxPriorityFeePerGas: allowNull(getBigInt),
      maxFeePerGas: allowNull(getBigInt),

      gasLimit: getBigInt,
      to: allowNull(getAddress, null),
      value: getBigInt,
      nonce: getNumber,
      data: formatData,

      creates: allowNull(getAddress, null),

      chainId: allowNull(getBigInt, null),
    },
    {
      data: ["input"],
      gasLimit: ["gas"],
    },
  )(value);

  // If to and creates are empty, populate the creates from the value
  if (
    (result.to === null || result.to === undefined) &&
    (result.creates === null || result.creates === undefined)
  ) {
    result.creates = getCreateAddress(result);
  }

  // @TODO: Check fee data

  // Add an access list to supported transaction types
  if (
    (value.type === 1 || value.type === 2) &&
    (value.accessList === null || value.accessList === undefined)
  ) {
    result.accessList = [];
  }

  // Compute the signature
  if (value.signature !== undefined && value.signature !== null) {
    result.signature = Signature.from(value.signature);
  } else {
    result.signature = Signature.from(value);
  }

  // Some backends omit ChainId on legacy transactions, but we can compute it
  if (result.chainId === null || result.chainId === undefined) {
    const chainId = result.signature.legacyChainId;
    if (chainId !== null && chainId !== undefined) {
      result.chainId = chainId;
    }
  }

  // 0x0000... should actually be null
  if (
    result.blockHash !== undefined &&
    result.blockHash !== null &&
    result.blockHash !== "" &&
    getBigInt(result.blockHash) === 0n
  ) {
    result.blockHash = null;
  }

  return result;
}
