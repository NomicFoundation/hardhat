import type { JsonRpcTransactionData } from "./types.js";
import type {
  EthereumProvider,
  JsonRpcRequest,
} from "../../../../../types/providers.js";

import { HardhatError } from "@ignored/hardhat-vnext-errors";

import { getRequestParams } from "../../json-rpc.js";

/**
 * This code defines an abstract class that modifies JSON-RPC requests.
 * It checks if the request is related to transactions and ensures that the "from" field is populated with a sender account if it's missing.
 * If no account is available for sending transactions, it throws an error.
 * The class also provides a mechanism to retrieve the sender account, which must be implemented by subclasses.
 */
export abstract class Sender {
  readonly #provider: EthereumProvider;

  constructor(provider: EthereumProvider) {
    this.#provider = provider;
  }

  public async modifyRequest(jsonRpcRequest: JsonRpcRequest): Promise<void> {
    const method = jsonRpcRequest.method;
    const params = getRequestParams(jsonRpcRequest);

    if (
      method === "eth_sendTransaction" ||
      method === "eth_call" ||
      method === "eth_estimateGas"
    ) {
      // TODO: from V2 - Should we validate this type?
      const tx: JsonRpcTransactionData = params[0];

      if (tx !== undefined && tx.from === undefined) {
        const senderAccount = await this.getSender(this.#provider);

        if (senderAccount !== undefined) {
          tx.from = senderAccount;
        } else if (method === "eth_sendTransaction") {
          throw new HardhatError(
            HardhatError.ERRORS.NETWORK.NO_REMOTE_ACCOUNT_AVAILABLE,
          );
        }
      }
    }
  }

  protected abstract getSender(
    provider: EthereumProvider,
  ): Promise<string | undefined>;
}
