import type { EthereumProvider } from "../../../../../../types/providers.js";

import { assertHardhatInvariant } from "@nomicfoundation/hardhat-errors";
import { min } from "@nomicfoundation/hardhat-utils/bigint";
import { ensureError } from "@nomicfoundation/hardhat-utils/error";
import {
  hexStringToNumber,
  numberToHexString,
} from "@nomicfoundation/hardhat-utils/hex";

import { EIP_7825_TRANSACTION_GAS_CAP } from "../../../edr/edr-constants.js";
import { isInternalCallOutOfGasError } from "../../../provider-errors.js";

/**
 * This class handles gas estimation for transactions by applying a multiplier to the estimated gas value.
 * It requests a gas estimation from the provider and multiplies it by a predefined gas multiplier, ensuring the gas does not exceed the block's gas limit.
 * If the estimation fails because an internal call runs out of gas regardless of the gas limit, the method returns the fallback gas limit, capped to the current block gas limit.
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
      //
      // When no fallback was configured (e.g. an http connection to a
      // `hardhat node` server), the EIP-7825 transaction gas cap is used
      // instead: it is a valid gas limit on every hardfork.
      //
      // The block gas limit is fetched fresh, not from the cache, because it
      // may have changed since the connection was created (e.g. via
      // evm_setBlockGasLimit) and a transaction with a gas limit above the
      // block gas limit can never be mined.
      if (isInternalCallOutOfGasError(error)) {
        const fallbackGas = this.#fallbackGas ?? EIP_7825_TRANSACTION_GAS_CAP;
        const blockGasLimit = BigInt(await this.#fetchLatestBlockGasLimit());

        return numberToHexString(min(fallbackGas, blockGasLimit));
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
      const fetchedGasLimit = await this.#fetchLatestBlockGasLimit();

      // We store a lower value in case the gas limit varies slightly
      this.#blockGasLimit = Math.floor(fetchedGasLimit * 0.95);
    }

    return this.#blockGasLimit;
  }

  async #fetchLatestBlockGasLimit(): Promise<number> {
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

    return hexStringToNumber(latestBlock.gasLimit);
  }
}
