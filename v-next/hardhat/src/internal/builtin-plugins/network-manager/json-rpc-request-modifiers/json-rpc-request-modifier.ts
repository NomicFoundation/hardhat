import type {
  ChainType,
  NetworkConnection,
} from "../../../../types/network.js";
import type {
  EthereumProvider,
  JsonRpcRequest,
} from "../../../../types/providers.js";
import type { NetworkConfig } from "@ignored/hardhat-vnext/types/config";

import { numberToHexString } from "@ignored/hardhat-vnext-utils/hex";
import { deepClone } from "@ignored/hardhat-vnext-utils/lang";

import { AutomaticSender } from "./accounts/automatic-sender-provider.js";
import { FixedSender } from "./accounts/fixed-sender-provider.js";
import { ChainIdValidator } from "./chain-id/chain-id-validator.js";
import { AutomaticGasPrice } from "./gas-properties/automatic-gas-price.js";
import { AutomaticGas } from "./gas-properties/automatic-gas.js";
import { FixedGasPrice } from "./gas-properties/fixed-gas-price.js";
import { FixedGas } from "./gas-properties/fixed-gas.js";
import { isHttpNetworkConfig } from "./utils.js";

/**
 * This class modifies JSON-RPC requests for transactions based on network configurations.
 * It handles gas, gas price, chain ID validation, and account management to ensure correct transaction parameters.
 * The request is cloned to avoid interfering with other handlers.
 */
export class JsonRpcRequestModifier {
  readonly #provider: EthereumProvider;
  readonly #networkConfig: NetworkConfig;

  // accounts
  #automaticSender: AutomaticSender | undefined;
  #fixedSender: FixedSender | undefined;

  // chainId
  #chainIdValidator: ChainIdValidator | undefined;

  // gas
  #automaticGas: AutomaticGas | undefined;
  #fixedGas: FixedGas | undefined;

  // gas price
  #automaticGasPrice: AutomaticGasPrice | undefined;
  #fixedGasPrice: FixedGasPrice | undefined;

  constructor(nextNetworkConnection: NetworkConnection<ChainType | string>) {
    this.#provider = nextNetworkConnection.provider;
    this.#networkConfig = nextNetworkConnection.networkConfig;
  }

  public async createModifiedJsonRpcRequest(
    jsonRpcRequest: JsonRpcRequest,
  ): Promise<JsonRpcRequest> {
    // We clone the request to avoid interfering with other hook handlers that
    // might be using the original request.
    // The "newJsonRpcRequest" inside this class is modified by reference.
    const newJsonRpcRequest = await deepClone(jsonRpcRequest);

    await this.#modifyAccountsIfNeeded(newJsonRpcRequest);

    await this.#modifyGasAndGasPriceIfNeeded(newJsonRpcRequest);

    await this.#validateChainIdIfNeeded(newJsonRpcRequest);

    return newJsonRpcRequest;
  }

  async #modifyAccountsIfNeeded(jsonRpcRequest: JsonRpcRequest): Promise<void> {
    if (this.#networkConfig.from !== undefined) {
      if (this.#fixedSender === undefined) {
        this.#fixedSender = new FixedSender(
          this.#provider,
          this.#networkConfig.from,
        );
      }

      await this.#fixedSender.modifyRequest(jsonRpcRequest);
    } else {
      if (this.#automaticSender === undefined) {
        this.#automaticSender = new AutomaticSender(this.#provider);
      }

      await this.#automaticSender.modifyRequest(jsonRpcRequest);
    }
  }

  async #modifyGasAndGasPriceIfNeeded(
    jsonRpcRequest: JsonRpcRequest,
  ): Promise<void> {
    if (
      this.#networkConfig.gas === undefined ||
      this.#networkConfig.gas === "auto"
    ) {
      if (this.#automaticGas === undefined) {
        this.#automaticGas = new AutomaticGas(
          this.#provider,
          this.#networkConfig.gasMultiplier,
        );
      }

      await this.#automaticGas.modifyRequest(jsonRpcRequest);
    } else {
      if (this.#fixedGas === undefined) {
        this.#fixedGas = new FixedGas(
          numberToHexString(this.#networkConfig.gas),
        );
      }

      this.#fixedGas.modifyRequest(jsonRpcRequest);
    }

    if (
      this.#networkConfig.gasPrice === undefined ||
      this.#networkConfig.gasPrice === "auto"
    ) {
      // If you use a hook handler that signs locally, you are required to
      // have all the transaction fields available, including the
      // gasPrice / maxFeePerGas & maxPriorityFeePerGas.
      //
      // We never use those when using EDR Network, as we sign within the
      // EDR Network itself. This means that we don't need to provide all the
      // fields, as the missing ones will be resolved there.
      //
      // EDR Network handles this in a more performant way, so we don't use
      // the AutomaticGasPrice for it.
      if (isHttpNetworkConfig(this.#networkConfig)) {
        if (this.#automaticGasPrice === undefined) {
          this.#automaticGasPrice = new AutomaticGasPrice(this.#provider);
        }

        await this.#automaticGasPrice.modifyRequest(jsonRpcRequest);
      }
    } else {
      if (this.#fixedGasPrice === undefined) {
        this.#fixedGasPrice = new FixedGasPrice(
          numberToHexString(this.#networkConfig.gasPrice),
        );
      }

      this.#fixedGasPrice.modifyRequest(jsonRpcRequest);
    }
  }

  async #validateChainIdIfNeeded(
    jsonRpcRequest: JsonRpcRequest,
  ): Promise<void> {
    // Avoid recursive behavior, as the chainIdValidator will call these methods.
    // This check prevents an infinite loop of chainIdValidator calling itself repeatedly.
    if (
      jsonRpcRequest.method === "eth_chainId" ||
      jsonRpcRequest.method === "net_version"
    ) {
      return;
    }

    if (
      isHttpNetworkConfig(this.#networkConfig) &&
      this.#networkConfig.chainId !== undefined
    ) {
      if (this.#chainIdValidator === undefined) {
        this.#chainIdValidator = new ChainIdValidator(
          this.#provider,
          this.#networkConfig.chainId,
        );
      }

      await this.#chainIdValidator.validate();
    }
  }
}
