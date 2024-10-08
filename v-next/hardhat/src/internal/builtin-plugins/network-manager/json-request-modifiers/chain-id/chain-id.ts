import type { EthereumProvider } from "../../../../../types/providers.js";

import {
  assertHardhatInvariant,
  HardhatError,
} from "@ignored/hardhat-vnext-errors";

import { rpcQuantityToNumber } from "../utils.js";

export class ChainIdValidator {
  readonly #provider: EthereumProvider;
  readonly #expectedChainId: number;

  #alreadyValidated = false;
  #chainId: number | undefined;

  constructor(provider: EthereumProvider, expectedChainId: number) {
    this.#provider = provider;
    this.#expectedChainId = expectedChainId;
  }

  public async validate(): Promise<void> {
    if (!this.#alreadyValidated) {
      const actualChainId = await this.#getChainId();

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

  async #getChainId(): Promise<number> {
    if (this.#chainId === undefined) {
      try {
        this.#chainId = await this.#getChainIdFromEthChainId();
      } catch {
        // If eth_chainId fails we default to net_version
        this.#chainId = await this.#getChainIdFromEthNetVersion();
      }
    }

    return this.#chainId;
  }

  async #getChainIdFromEthChainId(): Promise<number> {
    const id = await this.#provider.request({
      method: "eth_chainId",
    });

    assertHardhatInvariant(typeof id === "string", "id should be a string");

    return rpcQuantityToNumber(id);
  }

  async #getChainIdFromEthNetVersion(): Promise<number> {
    const id = await this.#provider.request({
      method: "net_version",
    });

    assertHardhatInvariant(typeof id === "string", "id should be a string");

    // There's a node returning this as decimal instead of QUANTITY.
    // TODO: Document here which node does that
    return id.startsWith("0x") ? rpcQuantityToNumber(id) : parseInt(id, 10);
  }
}
