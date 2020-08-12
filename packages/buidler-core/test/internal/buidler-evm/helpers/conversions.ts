/**
 * Transforms a QUANTITY to a number. It should only be used if you are 100% sure that the value
 * fits in a number.
 */
import { BN } from "ethereumjs-util";

import { decode } from "../../../../src/internal/buidler-evm/jsonrpc/types";
import { rpcQuantity } from "../../../../src/internal/buidler-evm/provider/input";

export function quantityToNumber(quantity: string): number {
  return parseInt(quantity.substring(2), 16);
}

export function quantityToBN(quantity: string): BN {
  return decode(quantity, rpcQuantity);
}
