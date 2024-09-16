import type { NumberLike } from "../types.js";

import { toRpcQuantity } from "./conversion.js";

export function toPaddedRpcQuantity(
  x: NumberLike,
  bytesLength: number,
): string {
  let rpcQuantity = toRpcQuantity(x);

  if (rpcQuantity.length < 2 + 2 * bytesLength) {
    const rpcQuantityWithout0x = rpcQuantity.slice(2);
    rpcQuantity = `0x${rpcQuantityWithout0x.padStart(2 * bytesLength, "0")}`;
  }

  return rpcQuantity;
}
