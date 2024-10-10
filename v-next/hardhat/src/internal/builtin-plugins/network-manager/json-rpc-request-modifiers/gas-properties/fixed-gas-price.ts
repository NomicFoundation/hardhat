import type { RequestArguments } from "../../../../../types/providers.js";

import { numberToHexString } from "@ignored/hardhat-vnext-utils/hex";

import { getParams } from "../utils.js";

export class FixedGasPrice {
  readonly #gasPrice: number | bigint;

  constructor(gasPrice: number | bigint) {
    this.#gasPrice = gasPrice;
  }

  public modifyRequest(args: RequestArguments): void {
    if (args.method === "eth_sendTransaction") {
      const params = getParams(args);

      // TODO: from V2 - Should we validate this type?
      const tx = params[0];

      // Temporary change to ignore EIP-1559
      if (
        tx !== undefined &&
        tx.gasPrice === undefined &&
        tx.maxFeePerGas === undefined &&
        tx.maxPriorityFeePerGas === undefined
      ) {
        tx.gasPrice = numberToHexString(this.#gasPrice);
      }
    }
  }
}
