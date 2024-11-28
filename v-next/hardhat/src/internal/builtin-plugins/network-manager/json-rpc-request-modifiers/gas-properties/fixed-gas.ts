import type { RequestArguments } from "../../../../../types/providers.js";
import type { PrefixedHexString } from "@ignored/hardhat-vnext-utils/hex";

import { getRequestParams } from "../../json-rpc.js";

/**
 * This class ensures that a fixed gas is applied to transaction requests.
 * For `eth_sendTransaction` requests, it sets the gas field with the value provided via the class constructor, if it hasn't been specified already.
 */
export class FixedGas {
  readonly #gas: Readonly<PrefixedHexString>;

  constructor(gas: PrefixedHexString) {
    this.#gas = gas;
  }

  public modifyRequest(args: RequestArguments): void {
    if (args.method === "eth_sendTransaction") {
      const params = getRequestParams(args);

      // TODO: from V2 - Should we validate this type?
      const tx = params[0];

      if (tx !== undefined && tx.gas === undefined) {
        tx.gas = this.#gas;
      }
    }
  }
}
