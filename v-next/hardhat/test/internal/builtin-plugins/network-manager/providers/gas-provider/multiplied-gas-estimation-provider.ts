import type { EthereumProvider } from "../../../../../../src/types/providers.js";

import { assertHardhatInvariant } from "@ignored/hardhat-vnext-errors";
import { ensureError } from "@ignored/hardhat-vnext-utils/error";
import { numberToHexString } from "@ignored/hardhat-vnext-utils/hex";

import { rpcQuantityToNumber } from "../../../../../../src/internal/builtin-plugins/network-manager/providers/utils.js";

export abstract class MultipliedGasEstimationProvider {
  readonly #provider: EthereumProvider;
  readonly #gasMultiplier: number;

  #blockGasLimit: number | undefined;

  constructor(provider: EthereumProvider, gasMultiplier: number) {
    this.#provider = provider;
    this.#gasMultiplier = gasMultiplier;
  }

  protected async getMultipliedGasEstimation(params: any[]): Promise<string> {
    try {
      const realEstimation = await this.#provider.request({
        method: "eth_estimateGas",
        params,
      });

      assertHardhatInvariant(
        typeof realEstimation === "string",
        "realEstimation should be a string",
      );

      if (this.#gasMultiplier === 1) {
        return realEstimation;
      }

      const normalGas = rpcQuantityToNumber(realEstimation);

      const gasLimit = await this.#getBlockGasLimit();

      const multiplied = Math.floor(normalGas * this.#gasMultiplier);

      const gas = multiplied > gasLimit ? gasLimit - 1 : multiplied;

      return numberToHexString(gas);
    } catch (error) {
      ensureError(error);

      if (error.message.toLowerCase().includes("execution error")) {
        const blockGasLimitTmp = await this.#getBlockGasLimit();
        return numberToHexString(blockGasLimitTmp);
      }

      throw error;
    }
  }

  async #getBlockGasLimit(): Promise<number> {
    if (this.#blockGasLimit === undefined) {
      const latestBlock = await this.#provider.request({
        method: "eth_getBlockByNumber",
        params: ["latest", false],
      });

      assertHardhatInvariant(
        typeof latestBlock === "object" &&
          latestBlock !== null &&
          "gasLimit" in latestBlock &&
          typeof latestBlock.gasLimit === "string",
        "latestBlock should have a gasLimit",
      );

      const fetchedGasLimit = rpcQuantityToNumber(latestBlock.gasLimit);

      // We store a lower value in case the gas limit varies slightly
      this.#blockGasLimit = Math.floor(fetchedGasLimit * 0.95);
    }

    return this.#blockGasLimit;
  }
}
