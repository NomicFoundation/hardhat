import {
  AccessListEIP2930TxData,
  FeeMarketEIP1559TxData,
  LegacyTxData,
} from "@nomicfoundation/ethereumjs-tx";
import { Address } from "@nomicfoundation/ethereumjs-util";

import { createNonCryptographicHashBasedIdentifier } from "../../../util/hash";

// Produces a signature with r and s values taken from a hash of the inputs.
export function makeFakeSignature(
  tx: LegacyTxData | AccessListEIP2930TxData | FeeMarketEIP1559TxData,
  sender: Address
): {
  r: number;
  s: number;
} {
  const hashInputString = [
    sender,
    tx.nonce,
    tx.gasLimit,
    tx.value,
    tx.to,
    tx.data,
    "gasPrice" in tx ? tx.gasPrice : "",
    "chainId" in tx ? tx.chainId : "",
    "maxPriorityFeePerGas" in tx ? tx.maxPriorityFeePerGas : "",
    "maxFeePerGas" in tx ? tx.maxFeePerGas : "",
    "accessList" in tx
      ? tx.accessList?.map((accessListItem) => {
          let address: string;
          let storageKeys: string[];
          if (Array.isArray(accessListItem)) {
            address = Buffer.from(accessListItem[0]).toString("hex");
            storageKeys = accessListItem[1].map((b) =>
              Buffer.from(b).toString("hex")
            );
          } else {
            address = accessListItem.address;
            storageKeys = accessListItem.storageKeys;
          }

          return [address, ...storageKeys]
            .map((b) => Buffer.from(b).toString("hex"))
            .join(";");
        })
      : "",
  ]
    .map((a) => a?.toString() ?? "")
    .join(",");

  const hashDigest = createNonCryptographicHashBasedIdentifier(
    Buffer.from(hashInputString)
  );

  return {
    r: hashDigest.readUInt32LE(),
    s: hashDigest.readUInt32LE(4),
  };
}
