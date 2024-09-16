import type { NumberLike } from "../types.js";

import { HardhatError } from "@ignored/hardhat-vnext-errors";

export function toNumber(x: NumberLike): number {
  return Number(toRpcQuantity(x));
}

export function toBigInt(x: NumberLike): bigint {
  return BigInt(toRpcQuantity(x));
}

export function toRpcQuantity(x: NumberLike): string {
  let hex: string;

  if (typeof x === "number" || typeof x === "bigint") {
    if (x < 0) {
      throw new HardhatError(
        HardhatError.ERRORS.NETWORK_HELPERS.CANNOT_CONVERT_NEGATIVE_NUMBER_TO_RPC_QUANTITY,
        {
          value: x,
        },
      );
    }

    hex = `0x${x.toString(16)}`;
  } else if (typeof x === "string") {
    if (!x.startsWith("0x")) {
      throw new HardhatError(
        HardhatError.ERRORS.NETWORK_HELPERS.ONLY_ALLOW_0X_PREFIXED_STRINGS,
      );
    }
    hex = x;
  } else if ("toHexString" in x) {
    hex = x.toHexString();
  } else if ("toString" in x) {
    hex = x.toString(16);
  } else {
    throw new HardhatError(
      HardhatError.ERRORS.NETWORK_HELPERS.CANNOT_CONVERT_TO_RPC_QUANTITY,
      {
        value: x,
      },
    );
  }

  if (hex === "0x0") {
    return hex;
  }

  return hex.startsWith("0x") ? hex.replace(/0x0+/, "0x") : `0x${hex}`;
}
