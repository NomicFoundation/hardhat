import type { JsonRpcRequest } from "../../../../../types/providers.js";
import type { NetworkConfig } from "@ignored/hardhat-vnext/types/config";

import { assertHardhatInvariant } from "@ignored/hardhat-vnext-errors";
import { numberToHexString } from "@ignored/hardhat-vnext-utils/hex";

import { getParams } from "../utils.js";

export class FixedGasPriceProvider {
  readonly #networkConfig: NetworkConfig;

  constructor(networkConfig: NetworkConfig) {
    this.#networkConfig = networkConfig;
  }

  public modifyRequest(jsonRpcRequest: JsonRpcRequest): void {
    if (jsonRpcRequest.method === "eth_sendTransaction") {
      const params = getParams(jsonRpcRequest);

      // TODO: Should we validate this type?
      const tx = params[0];

      // Temporary change to ignore EIP-1559
      if (
        tx !== undefined &&
        tx.gasPrice === undefined &&
        tx.maxFeePerGas === undefined &&
        tx.maxPriorityFeePerGas === undefined
      ) {
        // networkConfig.gasPrice = "auto" is not allowed here, it is handled in AutomaticGasPriceProvider

        assertHardhatInvariant(
          typeof this.#networkConfig.gasPrice === "number" ||
            typeof this.#networkConfig.gasPrice === "bigint",
          "networkConfig.gasPrice should be a number or bigint",
        );

        tx.gasPrice = numberToHexString(this.#networkConfig.gasPrice);
      }
    }
  }
}
