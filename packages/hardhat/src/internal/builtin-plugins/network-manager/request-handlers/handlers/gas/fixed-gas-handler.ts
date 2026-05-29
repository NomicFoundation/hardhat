import type {
  JsonRpcRequest,
  JsonRpcResponse,
} from "../../../../../../types/providers.js";
import type { RequestHandler } from "../../types.js";
import type { PrefixedHexString } from "@nomicfoundation/hardhat-utils/hex";

import { isObject } from "@nomicfoundation/hardhat-utils/lang";

import { getRequestParams, updateRequestParams } from "../../../json-rpc.js";

/**
 * This class ensures that a fixed gas is applied to transaction requests.
 * For `eth_sendTransaction` requests, it sets the gas field with the value provided via the class constructor, if it hasn't been specified already.
 */
export class FixedGasHandler implements RequestHandler {
  readonly #methods: ReadonlySet<string> = new Set(["eth_sendTransaction"]);

  readonly #gas: PrefixedHexString;

  constructor(gas: PrefixedHexString) {
    this.#gas = gas;
  }

  public isSupportedMethod(jsonRpcRequest: JsonRpcRequest): boolean {
    return this.#methods.has(jsonRpcRequest.method);
  }

  public async handle(
    jsonRpcRequest: JsonRpcRequest,
  ): Promise<JsonRpcRequest | JsonRpcResponse> {
    if (!this.isSupportedMethod(jsonRpcRequest)) {
      return jsonRpcRequest;
    }

    const params = getRequestParams(jsonRpcRequest);
    const [tx] = params;

    if (isObject(tx) && tx.gas === undefined) {
      const updatedParams = [...params];
      updatedParams[0] = { ...tx, gas: this.#gas };

      return updateRequestParams(jsonRpcRequest, updatedParams);
    }

    return jsonRpcRequest;
  }
}
