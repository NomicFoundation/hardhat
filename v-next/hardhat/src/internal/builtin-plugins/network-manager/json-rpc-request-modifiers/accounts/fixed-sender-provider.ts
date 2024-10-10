import type { EthereumProvider } from "../../../../../types/providers.js";

import { Sender } from "./sender.js";

export class FixedSender extends Sender {
  readonly #sender: string;

  constructor(provider: EthereumProvider, sender: string) {
    super(provider);
    this.#sender = sender;
  }

  protected async getSender(
    _provider: EthereumProvider,
  ): Promise<string | undefined> {
    return this.#sender;
  }
}
