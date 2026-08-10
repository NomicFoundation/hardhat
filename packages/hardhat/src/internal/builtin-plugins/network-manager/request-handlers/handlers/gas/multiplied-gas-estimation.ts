import type { EthereumProvider } from "../../../../../../types/providers.js";

import { assertHardhatInvariant } from "@nomicfoundation/hardhat-errors";
import { ensureError } from "@nomicfoundation/hardhat-utils/error";
import {
  hexStringToNumber,
  numberToHexString,
} from "@nomicfoundation/hardhat-utils/hex";

import { InternalCallOutOfGasError } from "../../../provider-errors.js";

/**
 * This class handles gas estimation for transactions by applying a multiplier to the estimated gas value.
 * It requests a gas estimation from the provider and multiplies it by a predefined gas multiplier, ensuring the gas does not exceed the block's gas limit.
 * If the estimation fails because an internal call runs out of gas regardless of the gas limit, the method returns the fallback gas limit, if one was provided.
 * If any other execution error occurs, the method returns the block's gas limit instead.
 * The block gas limit is cached after the first retrieval to optimize performance.
 */
export abstract class MultipliedGasEstimation {
  readonly #provider: EthereumProvider;
  readonly #gasMultiplier: number;
  readonly #fallbackGas: bigint | undefined;

  #blockGasLimit: number | undefined;

  constructor(
    provider: EthereumProvider,
    gasMultiplier: number,
    fallbackGas?: bigint,
  ) {
    this.#provider = provider;
    this.#gasMultiplier = gasMultiplier;
    this.#fallbackGas = fallbackGas;
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

      const normalGas = hexStringToNumber(realEstimation);

      const gasLimit = await this.#getBlockGasLimit();

      const multiplied = Math.floor(normalGas * this.#gasMultiplier);

      const gas = multiplied > gasLimit ? gasLimit - 1 : multiplied;

      return numberToHexString(gas);
    } catch (error) {
      ensureError(error);

      // The user didn't request the estimation, so instead of failing the
      // transaction we fall back to the default transaction gas limit that
      // the network would use for requests without a gas field.
      if (
        error instanceof InternalCallOutOfGasError &&
        this.#fallbackGas !== undefined
      ) {
        return numberToHexString(this.#fallbackGas);
      }

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

      const fetchedGasLimit = hexStringToNumber(latestBlock.gasLimit);

      // We store a lower value in case the gas limit varies slightly
      this.#blockGasLimit = Math.floor(fetchedGasLimit * 0.95);
    }

    return this.#blockGasLimit;
  }
}
