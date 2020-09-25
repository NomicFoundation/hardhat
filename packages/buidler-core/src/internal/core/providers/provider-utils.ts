import { HardhatError } from "../errors";
import { ERRORS } from "../errors-list";

export function rpcQuantityToNumber(quantity?: string) {
  if (quantity === undefined) {
    throw new HardhatError(ERRORS.NETWORK.INVALID_RPC_QUANTITY_VALUE, {
      value: quantity,
    });
  }

  if (
    typeof quantity !== "string" ||
    quantity.match(/^0x(?:0|(?:[1-9a-fA-F][0-9a-fA-F]*))$/) === null
  ) {
    throw new HardhatError(ERRORS.NETWORK.INVALID_RPC_QUANTITY_VALUE, {
      value: quantity,
    });
  }

  return parseInt(quantity.substring(2), 16);
}

export function numberToRpcQuantity(n: number) {
  const hex = n.toString(16);
  return `0x${hex}`;
}
