import type { JsonRpcRequest } from "../../../../../types/providers.js";
import type { NetworkConfig } from "@ignored/hardhat-vnext/types/config";

import { assertHardhatInvariant } from "@ignored/hardhat-vnext-errors";
import { numberToHexString } from "@ignored/hardhat-vnext-utils/hex";

import { getParams } from "../utils.js";

export class FixedGasProvider {
  readonly #networkConfig: NetworkConfig;

  constructor(networkConfig: NetworkConfig) {
    this.#networkConfig = networkConfig;
  }

  public modifyRequest(jsonRpcRequest: JsonRpcRequest): void {
    if (jsonRpcRequest.method === "eth_sendTransaction") {
      const params = getParams(jsonRpcRequest);

      // TODO: Should we validate this type?
      const tx = params[0];

      if (tx !== undefined && tx.gas === undefined) {
        // networkConfig.gas = "auto" is not allowed here, it is handled in AutomaticGasProvider

        assertHardhatInvariant(
          typeof this.#networkConfig.gas === "number" ||
            typeof this.#networkConfig.gas === "bigint",
          "networkConfig.gas should be a number or bigint",
        );

        tx.gas = numberToHexString(this.#networkConfig.gas);
      }
    }
  }
}
