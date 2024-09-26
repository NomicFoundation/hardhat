import type { TransactionRequest, JsonRpcTransactionRequest } from "ethers";

import { toQuantity, hexlify, getBigInt, accessListify } from "ethers";

export function getRpcTransaction(
  tx: TransactionRequest,
): JsonRpcTransactionRequest {
  const result: JsonRpcTransactionRequest = {};

  let txKeys: Array<keyof TransactionRequest> = [
    "chainId",
    "gasLimit",
    "gasPrice",
    "type",
    "maxFeePerGas",
    "maxPriorityFeePerGas",
    "nonce",
    "value",
  ];

  // JSON-RPC now requires numeric values to be "quantity" values
  txKeys.forEach((key) => {
    if (tx[key] === null || tx[key] === undefined) {
      return;
    }

    let dstKey: string = key;
    if (key === "gasLimit") {
      dstKey = "gas";
    }

    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- variable 'result' has the same keys as the one used for the variable 'tx', except "gasLimit"
    (result as any)[dstKey] = toQuantity(getBigInt(tx[key], `tx.${key}`));
  });

  txKeys = ["from", "to", "data"];

  // Make sure addresses and data are lowercase
  txKeys.forEach((key) => {
    if (tx[key] === null || tx[key] === undefined) {
      return;
    }

    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- variable 'result' has the same keys as the one used for the variable 'tx', except "gasLimit"
    (result as any)[key] = hexlify(tx[key]);
  });

  // Normalize the access list object
  if (tx.accessList !== null && tx.accessList !== undefined) {
    result.accessList = accessListify(tx.accessList);
  }

  return result;
}
