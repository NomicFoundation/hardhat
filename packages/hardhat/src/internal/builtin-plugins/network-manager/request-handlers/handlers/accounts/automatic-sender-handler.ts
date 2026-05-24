import type {
  JsonRpcRequest,
  JsonRpcResponse,
} from "../../../../../../types/providers.js";

import { SenderHandler } from "./sender.js";

/**
 * This class automatically retrieves and caches the first available account from the connected provider.
 * It overrides the getSender method of the base class to request the list of accounts if the first account has not been fetched yet,
 * ensuring dynamic selection of the sender for all JSON-RPC requests without requiring manual input.
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

    if (this.#alreadyFetchedAccounts === false) {
      const accounts = await this.provider.request({
        method: "eth_accounts",
      });

      if (!Array.isArray(accounts)) {
        return {
          jsonrpc: "2.0",
          id: jsonRpcRequest.id,
          error: {
            code: -32603,
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
