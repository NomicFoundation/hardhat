import type { EthereumProvider } from "../../../../../../types/providers.js";

import { SenderHandler } from "./sender.js";

/**
 * This class provides a fixed sender address for transactions.
 * It overrides the getSender method of the base class to always return the sender address specified during instantiation,
 * ensuring that all JSON-RPC requests use this fixed sender.
 */
export class FixedSenderHandler extends SenderHandler {
  readonly #sender: string;

  constructor(provider: EthereumProvider, sender: string) {
    super(provider);
    this.#sender = sender;
  }

  protected async getSender(): Promise<string | undefined> {
    return this.#sender;
  }
}
