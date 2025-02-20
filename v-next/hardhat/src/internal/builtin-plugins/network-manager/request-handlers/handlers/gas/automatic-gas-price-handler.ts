import type {
  EthereumProvider,
  JsonRpcRequest,
  JsonRpcResponse,
} from "../../../../../../types/providers.js";
import type { RequestHandler } from "../../types.js";

import { assertHardhatInvariant } from "@nomicfoundation/hardhat-errors";
import {
  hexStringToBigInt,
  numberToHexString,
} from "@nomicfoundation/hardhat-utils/hex";
import { isObject } from "@nomicfoundation/hardhat-utils/lang";

import { getRequestParams } from "../../../json-rpc.js";

/**
 * This class automatically adjusts transaction requests to include appropriately estimated gas prices.
 * It ensures that gas prices are set correctly.
 */
export class AutomaticGasPriceHandler implements RequestHandler {
  readonly #provider: EthereumProvider;

  // We pay the max base fee that can be required if the next
  // EIP1559_BASE_FEE_MAX_FULL_BLOCKS_PREFERENCE are full.
  public static readonly EIP1559_BASE_FEE_MAX_FULL_BLOCKS_PREFERENCE: bigint =
    3n;

  // See eth_feeHistory for an explanation of what this means
  public static readonly EIP1559_REWARD_PERCENTILE = 50;

  constructor(provider: EthereumProvider) {
    this.#provider = provider;
  }

  #nodeHasFeeHistory?: boolean;
  #nodeSupportsEIP1559?: boolean;

  public async handle(
    jsonRpcRequest: JsonRpcRequest,
  ): Promise<JsonRpcRequest | JsonRpcResponse> {
    if (jsonRpcRequest.method !== "eth_sendTransaction") {
      return jsonRpcRequest;
    }

    const params = getRequestParams(jsonRpcRequest);
    const [tx] = params;

    if (!isObject(tx)) {
      return jsonRpcRequest;
    }

    // We don't need to do anything in these cases
    if (
      tx.gasPrice !== undefined ||
      (tx.maxFeePerGas !== undefined && tx.maxPriorityFeePerGas !== undefined)
    ) {
      return jsonRpcRequest;
    }

    let suggestedEip1559Values = await this.#suggestEip1559FeePriceValues();

    // eth_feeHistory failed, so we send a legacy one
    if (
      tx.maxFeePerGas === undefined &&
      tx.maxPriorityFeePerGas === undefined &&
      suggestedEip1559Values === undefined
    ) {
      tx.gasPrice = numberToHexString(await this.#getGasPrice());
      return jsonRpcRequest;
    }

    // If eth_feeHistory failed, but the user still wants to send an EIP-1559 tx
    // we use the gasPrice as default values.
    if (suggestedEip1559Values === undefined) {
      const gasPrice = await this.#getGasPrice();

      suggestedEip1559Values = {
        maxFeePerGas: gasPrice,
        maxPriorityFeePerGas: gasPrice,
      };
    }

    let maxFeePerGas =
      typeof tx.maxFeePerGas === "string"
        ? hexStringToBigInt(tx.maxFeePerGas)
        : suggestedEip1559Values.maxFeePerGas;

    const maxPriorityFeePerGas =
      typeof tx.maxPriorityFeePerGas === "string"
        ? hexStringToBigInt(tx.maxPriorityFeePerGas)
        : suggestedEip1559Values.maxPriorityFeePerGas;

    if (maxFeePerGas < maxPriorityFeePerGas) {
      maxFeePerGas += maxPriorityFeePerGas;
    }

    tx.maxFeePerGas = numberToHexString(maxFeePerGas);
    tx.maxPriorityFeePerGas = numberToHexString(maxPriorityFeePerGas);

    return jsonRpcRequest;
  }

  async #getGasPrice(): Promise<bigint> {
    const response = await this.#provider.request({
      method: "eth_gasPrice",
    });

    assertHardhatInvariant(
      typeof response === "string",
      "response should return a string",
    );

    return hexStringToBigInt(response);
  }

  async #suggestEip1559FeePriceValues(): Promise<
    | {
        maxFeePerGas: bigint;
        maxPriorityFeePerGas: bigint;
      }
    | undefined
  > {
    if (this.#nodeSupportsEIP1559 === undefined) {
      const block = await this.#provider.request({
        method: "eth_getBlockByNumber",
        params: ["latest", false],
      });

      assertHardhatInvariant(
        isObject(block),
        "block should be a non null object",
      );

      this.#nodeSupportsEIP1559 =
        "baseFeePerGas" in block && block.baseFeePerGas !== undefined;
    }

    if (
      this.#nodeHasFeeHistory === false ||
      this.#nodeSupportsEIP1559 === false
    ) {
      return;
    }

    try {
      const response = await this.#provider.request({
        method: "eth_feeHistory",
        params: [
          "0x1",
          "latest",
          [AutomaticGasPriceHandler.EIP1559_REWARD_PERCENTILE],
        ],
      });

      assertHardhatInvariant(
        typeof response === "object" &&
          response !== null &&
          "baseFeePerGas" in response &&
          "reward" in response &&
          Array.isArray(response.baseFeePerGas) &&
          Array.isArray(response.reward),
        "response should be an object with baseFeePerGas and reward properties",
      );

      let maxPriorityFeePerGas = hexStringToBigInt(response.reward[0][0]);

      if (maxPriorityFeePerGas === 0n) {
        try {
          const suggestedMaxPriorityFeePerGas = await this.#provider.request({
            method: "eth_maxPriorityFeePerGas",
            params: [],
          });

          assertHardhatInvariant(
            typeof suggestedMaxPriorityFeePerGas === "string",
            "suggestedMaxPriorityFeePerGas should be a string",
          );

          maxPriorityFeePerGas = hexStringToBigInt(
            suggestedMaxPriorityFeePerGas,
          );
        } catch {
          // if eth_maxPriorityFeePerGas does not exist, use 1 wei
          maxPriorityFeePerGas = 1n;
        }
      }

      // If after all of these we still have a 0 wei maxPriorityFeePerGas, we
      // use 1 wei. This is to improve the UX of the automatic gas price
      // on chains that are very empty (i.e local testnets). This will be very
      // unlikely to trigger on a live chain.
      if (maxPriorityFeePerGas === 0n) {
        maxPriorityFeePerGas = 1n;
      }

      return {
        // Each block increases the base fee by 1/8 at most, when full.
        // We have the next block's base fee, so we compute a cap for the
        // next N blocks here.

        maxFeePerGas:
          (hexStringToBigInt(response.baseFeePerGas[1]) *
            9n **
              (AutomaticGasPriceHandler.EIP1559_BASE_FEE_MAX_FULL_BLOCKS_PREFERENCE -
                1n)) /
          8n **
            (AutomaticGasPriceHandler.EIP1559_BASE_FEE_MAX_FULL_BLOCKS_PREFERENCE -
              1n),

        maxPriorityFeePerGas,
      };
    } catch {
      this.#nodeHasFeeHistory = false;

      return undefined;
    }
  }
}
