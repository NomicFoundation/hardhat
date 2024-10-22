import type { EthereumProvider } from "../../../../../types/providers.js";

import { assertHardhatInvariant } from "@ignored/hardhat-vnext-errors";

import { Sender } from "./sender.js";

/**
 * This class automatically retrieves and caches the first available account from the connected provider.
 * It overrides the getSender method of the base class to request the list of accounts if the first account has not been fetched yet,
 * ensuring dynamic selection of the sender for all JSON-RPC requests without requiring manual input.
 */
export class AutomaticSender extends Sender {
  #firstAccount: string | undefined;

  protected async getSender(
    provider: EthereumProvider,
  ): Promise<string | undefined> {
    if (this.#firstAccount === undefined) {
      const accounts = await provider.request({
        method: "eth_accounts",
      });

      assertHardhatInvariant(
        Array.isArray(accounts) && typeof accounts[0] === "string",
        "accounts should be an array and accounts[0] should be a string",
      );

      this.#firstAccount = accounts[0];
    }

    return this.#firstAccount;
  }
}
