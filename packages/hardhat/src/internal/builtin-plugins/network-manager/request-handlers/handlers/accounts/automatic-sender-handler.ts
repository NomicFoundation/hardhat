import type {
  JsonRpcRequest,
  JsonRpcResponse,
} from "../../../../../../types/providers.js";

import { isObject } from "@nomicfoundation/hardhat-utils/lang";

import { getRequestParams } from "../../../json-rpc.js";
import { InternalError } from "../../../provider-errors.js";

import { SenderHandler } from "./sender.js";

/**
 * This class automatically retrieves and caches the first available account from the connected provider.
 * On the first supported request, fetches and caches `eth_accounts` so callers don't need to set `from` manually.
 * If `eth_accounts` responds with a non-array, it returns a JSON-RPC error.
 */
export class AutomaticSenderHandler extends SenderHandler {
  #alreadyFetchedAccounts = false;
  #firstAccount: string | undefined;

  public override async handle(
    jsonRpcRequest: JsonRpcRequest,
  ): Promise<JsonRpcRequest | JsonRpcResponse> {
    if (!this.isSupportedMethod(jsonRpcRequest)) {
      return jsonRpcRequest;
    }

    const [tx] = getRequestParams(jsonRpcRequest);
    if (!isObject(tx) || tx.from !== undefined) {
      // Skip the eth_accounts fetch when we won't need a sender anyway:
      // the tx isn't an object, or it already carries a `from`.
      return await super.handle(jsonRpcRequest);
    }

    if (this.#alreadyFetchedAccounts === false) {
      const accounts = await this.provider.request({
        method: "eth_accounts",
      });

      if (!Array.isArray(accounts)) {
        return {
          jsonrpc: "2.0",
          id: jsonRpcRequest.id,
          error: {
            code: InternalError.CODE,
            message: "eth_accounts did not return an array of accounts",
          },
        };
      }

      this.#firstAccount = accounts[0];
      this.#alreadyFetchedAccounts = true;
    }

    return await super.handle(jsonRpcRequest);
  }

  protected async getSender(): Promise<string | undefined> {
    return this.#firstAccount;
  }
}
