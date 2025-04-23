import type {
  JsonRpcRequest,
  JsonRpcResponse,
} from "../../../../../../types/providers.js";
import type { RequestHandler } from "../../types.js";
import type { PrefixedHexString } from "@nomicfoundation/hardhat-utils/hex";

import { isObject } from "@nomicfoundation/hardhat-utils/lang";

import { getRequestParams } from "../../../json-rpc.js";

/**
 * This class ensures that a fixed gas is applied to transaction requests.
 * For `eth_sendTransaction` requests, it sets the gas field with the value provided via the class constructor, if it hasn't been specified already.
 */
export class FixedGasHandler implements RequestHandler {
  readonly #gas: PrefixedHexString;

  constructor(gas: PrefixedHexString) {
    this.#gas = gas;
  }

  public async handle(
    jsonRpcRequest: JsonRpcRequest,
  ): Promise<JsonRpcRequest | JsonRpcResponse> {
    if (jsonRpcRequest.method !== "eth_sendTransaction") {
      return jsonRpcRequest;
    }

    const params = getRequestParams(jsonRpcRequest);
    const [tx] = params;

    if (isObject(tx) && tx.gas === undefined) {
      tx.gas = this.#gas;
    }

    return jsonRpcRequest;
  }
}
