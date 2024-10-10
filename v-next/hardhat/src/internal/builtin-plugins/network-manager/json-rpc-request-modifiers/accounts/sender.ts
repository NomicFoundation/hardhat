import type { JsonRpcTransactionData } from "./types.js";
import type {
  EthereumProvider,
  JsonRpcRequest,
} from "../../../../../types/providers.js";

import { HardhatError } from "@ignored/hardhat-vnext-errors";

import { getParams } from "../utils.js";

export abstract class Sender {
  readonly #provider: EthereumProvider;

  constructor(provider: EthereumProvider) {
    this.#provider = provider;
  }

  public async modifyRequest(jsonRpcRequest: JsonRpcRequest): Promise<void> {
    const method = jsonRpcRequest.method;
    const params = getParams(jsonRpcRequest);

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
