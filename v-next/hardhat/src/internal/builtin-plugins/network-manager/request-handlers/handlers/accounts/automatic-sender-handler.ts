import { assertHardhatInvariant } from "@ignored/hardhat-vnext-errors";

import { SenderHandler } from "./sender.js";

/**
 * This class automatically retrieves and caches the first available account from the connected provider.
 * It overrides the getSender method of the base class to request the list of accounts if the first account has not been fetched yet,
 * ensuring dynamic selection of the sender for all JSON-RPC requests without requiring manual input.
 */
export class AutomaticSenderHandler extends SenderHandler {
  #alreadyFetchedAccounts = false;
  #firstAccount: string | undefined;

  protected async getSender(): Promise<string | undefined> {
    if (this.#alreadyFetchedAccounts === false) {
      const accounts = await this.provider.request({
        method: "eth_accounts",
      });

      // TODO: This shouldn't be an exception but a failed JSON response!
      assertHardhatInvariant(
        Array.isArray(accounts),
        "eth_accounts response should be an array",
      );

      this.#firstAccount = accounts[0];
      this.#alreadyFetchedAccounts = true;
    }

    return this.#firstAccount;
  }
}
