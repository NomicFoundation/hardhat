import type {
  JsonRpcRequest,
  JsonRpcResponse,
} from "../../../../../../types/providers.js";
import type { RequestHandler } from "../../types.js";
import type { PrefixedHexString } from "@ignored/hardhat-vnext-utils/hex";

import { isObject } from "@ignored/hardhat-vnext-utils/lang";

import { getRequestParams } from "../../../json-rpc.js";

/**
 * This class ensures that a fixed gas price is applied to transaction requests.
 * For `eth_sendTransaction` requests, it sets the gasPrice field with the value provided via the class constructor, if it hasn't been specified already.
 */
export class FixedGasPriceHandler implements RequestHandler {
  readonly #gasPrice: PrefixedHexString;

  constructor(gasPrice: PrefixedHexString) {
    this.#gasPrice = gasPrice;
  }

  public async handle(
    jsonRpcRequest: JsonRpcRequest,
  ): Promise<JsonRpcRequest | JsonRpcResponse> {
    if (jsonRpcRequest.method !== "eth_sendTransaction") {
      return jsonRpcRequest;
    }

    const params = getRequestParams(jsonRpcRequest);
    const [tx] = params;

    // Temporary change to ignore EIP-1559
    if (
      isObject(tx) &&
      tx.gasPrice === undefined &&
      tx.maxFeePerGas === undefined &&
      tx.maxPriorityFeePerGas === undefined
    ) {
      tx.gasPrice = this.#gasPrice;
    }

    return jsonRpcRequest;
  }
}
