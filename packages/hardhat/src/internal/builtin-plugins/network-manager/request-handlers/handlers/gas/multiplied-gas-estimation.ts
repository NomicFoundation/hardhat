import type { EthereumProvider } from "../../../../../../types/providers.js";

import { assertHardhatInvariant } from "@nomicfoundation/hardhat-errors";
import { min } from "@nomicfoundation/hardhat-utils/bigint";
import { ensureError } from "@nomicfoundation/hardhat-utils/error";
import {
  hexStringToNumber,
  numberToHexString,
} from "@nomicfoundation/hardhat-utils/hex";

import { InternalCallOutOfGasError } from "../../../provider-errors.js";

/**
 * The fraction of the observed block gas limit that gets cached and used as the
 * gas limit ceiling. The cached value is deliberately lower than what the
 * latest block reported, to leave room for the block gas limit varying
 * slightly between blocks after we cached it.
 */
export const BLOCK_GAS_LIMIT_SAFETY_FACTOR = 0.95;

/**
 * This class handles gas estimation for transactions by applying a multiplier to the estimated gas value.
 * It requests a gas estimation from the provider and multiplies it by a predefined gas multiplier, ensuring the gas does not exceed the block's gas limit.
 * If the estimation fails because an internal call runs out of gas regardless of the gas limit, the method returns the fallback gas limit, capped to the current block gas limit, or rethrows when no fallback gas limit is known.
 * If any other error whose message contains "execution error" occurs, the method returns the capped block gas limit instead. Every other error is rethrown.
 * The capped block gas limit is the latest block's gas limit scaled by `BLOCK_GAS_LIMIT_SAFETY_FACTOR`, cached after the first retrieval to optimize performance, except when capping the fallback gas limit, which reads the pending block's unscaled one.
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

      // We fall back instead of failing the transaction, because the user
      // never asked for this estimation. The fallback is the gas limit the
      // network itself uses for requests with no gas field. Connections that
      // don't expose it (e.g. an http connection to a `hardhat node` server)
      // get no fallback, and the estimation error reaches the user instead of
      // a guessed limit that may not suit the remote network: the error names
      // both remedies, an explicit gas limit or the topLevelSuccess mode.
      //
      // The block gas limit caps the fallback, read from the pending block
      // rather than from the cache, as evm_setBlockGasLimit may have lowered
      // it since. The latest block's header only reflects such a change once a
      // block has been mined under the new limit, whereas the pending block
      // already does, so reading it is what keeps the fallback mineable. It
      // caps even on networks that don't enforce a limit, since their headers
      // still report a value: that only lowers a still-mineable fallback,
      // whereas skipping the cap where a limit is enforced would get the
      // transaction rejected.
      if (
        error instanceof InternalCallOutOfGasError &&
        this.#fallbackGas !== undefined
      ) {
        const blockGasLimit = BigInt(await this.#fetchBlockGasLimit("pending"));

        return numberToHexString(min(this.#fallbackGas, blockGasLimit));
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
      const fetchedGasLimit = await this.#fetchBlockGasLimit("latest");

      // We store a lower value in case the gas limit varies slightly
      this.#blockGasLimit = Math.floor(
        fetchedGasLimit * BLOCK_GAS_LIMIT_SAFETY_FACTOR,
      );
    }

    return this.#blockGasLimit;
  }

  async #fetchBlockGasLimit(blockTag: "latest" | "pending"): Promise<number> {
    const block = await this.#provider.request({
      method: "eth_getBlockByNumber",
      params: [blockTag, false],
    });

    assertHardhatInvariant(
      typeof block === "object" &&
        block !== null &&
        "gasLimit" in block &&
        typeof block.gasLimit === "string",
      `the ${blockTag} block should have a gasLimit`,
    );

    return hexStringToNumber(block.gasLimit);
  }
}
