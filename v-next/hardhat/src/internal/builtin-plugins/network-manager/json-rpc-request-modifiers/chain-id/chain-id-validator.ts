import type { EthereumProvider } from "../../../../../types/providers.js";

import { HardhatError } from "@ignored/hardhat-vnext-errors";

import { ChainId } from "./chain-id.js";

export class ChainIdValidator extends ChainId {
  readonly #expectedChainId: number;

  #alreadyValidated = false;
  readonly #chainId: number | undefined;

  constructor(provider: EthereumProvider, expectedChainId: number) {
    super(provider);
    this.#expectedChainId = expectedChainId;
  }

  public async validate(): Promise<void> {
    if (!this.#alreadyValidated) {
      const actualChainId = await this.getChainId();

      if (actualChainId !== this.#expectedChainId) {
        throw new HardhatError(
          HardhatError.ERRORS.NETWORK.INVALID_GLOBAL_CHAIN_ID,
          {
            configChainId: this.#expectedChainId,
            connectionChainId: actualChainId,
          },
        );
      }

      this.#alreadyValidated = true;
    }
  }
}
