import type { EthereumProvider } from "../../../../../types/providers.js";

import { assertHardhatInvariant } from "@ignored/hardhat-vnext-errors";
import {
  hexStringToNumber,
  isHexStringPrefixed,
} from "@ignored/hardhat-vnext-utils/hex";

export abstract class ChainId {
  protected readonly provider: EthereumProvider;

  #chainId: number | undefined;

  constructor(provider: EthereumProvider) {
    this.provider = provider;
  }

  protected async getChainId(): Promise<number> {
    if (this.#chainId === undefined) {
      try {
        this.#chainId = await this.getChainIdFromEthChainId();
      } catch {
        // If eth_chainId fails we default to net_version
        this.#chainId = await this.#getChainIdFromEthNetVersion();
      }
    }

    return this.#chainId;
  }

  protected async getChainIdFromEthChainId(): Promise<number> {
    const id = await this.provider.request({
      method: "eth_chainId",
    });

    assertHardhatInvariant(typeof id === "string", "id should be a string");

    return hexStringToNumber(id);
  }

  async #getChainIdFromEthNetVersion(): Promise<number> {
    const id = await this.provider.request({
      method: "net_version",
    });

    assertHardhatInvariant(typeof id === "string", "id should be a string");

    // There's a node returning this as decimal instead of QUANTITY.
    // TODO: from V2 - Document here which node does that
    return isHexStringPrefixed(id) ? hexStringToNumber(id) : parseInt(id, 10);
  }
}
