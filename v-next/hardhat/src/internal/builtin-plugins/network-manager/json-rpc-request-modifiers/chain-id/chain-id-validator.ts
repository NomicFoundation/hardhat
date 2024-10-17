import type { EthereumProvider } from "../../../../../types/providers.js";

import { HardhatError } from "@ignored/hardhat-vnext-errors";

import { ChainId } from "./chain-id.js";

/**
 * This class extends `ChainId` to validate that the current provider's chain ID matches
 * an expected value. If the actual chain ID differs from the expected one, it throws a
 * HardhatError to signal a network configuration mismatch. Once validated, further checks
 * are skipped to avoid redundant validations.
 */
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
