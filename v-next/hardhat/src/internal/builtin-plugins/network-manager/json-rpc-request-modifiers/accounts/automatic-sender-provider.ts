import type { EthereumProvider } from "../../../../../types/providers.js";

import { assertHardhatInvariant } from "@ignored/hardhat-vnext-errors";

import { Sender } from "./sender.js";

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
        "accounts should be an array and accounts[0] should be a sting",
      );

      this.#firstAccount = accounts[0];
    }

    return this.#firstAccount;
  }
}
