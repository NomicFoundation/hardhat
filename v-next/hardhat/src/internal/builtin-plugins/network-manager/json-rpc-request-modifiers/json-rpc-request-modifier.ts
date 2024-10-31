import type {
  ChainType,
  NetworkConnection,
} from "../../../../types/network.js";
import type {
  EthereumProvider,
  JsonRpcRequest,
  JsonRpcResponse,
} from "../../../../types/providers.js";
import type {
  HDAccountsUserConfig,
  HttpNetworkAccountsUserConfig,
  NetworkConfig,
} from "@ignored/hardhat-vnext/types/config";

import { numberToHexString } from "@ignored/hardhat-vnext-utils/hex";
import { deepClone } from "@ignored/hardhat-vnext-utils/lang";

import { AutomaticSender } from "./accounts/automatic-sender-provider.js";
import { FixedSender } from "./accounts/fixed-sender-provider.js";
import { HDWallet } from "./accounts/hd-wallet.js";
import { LocalAccounts } from "./accounts/local-accounts.js";
import { ChainIdValidator } from "./chain-id/chain-id-validator.js";
import { AutomaticGasPrice } from "./gas-properties/automatic-gas-price.js";
import { AutomaticGas } from "./gas-properties/automatic-gas.js";
import { FixedGasPrice } from "./gas-properties/fixed-gas-price.js";
import { FixedGas } from "./gas-properties/fixed-gas.js";
import { isHttpNetworkConfig } from "./utils.js";

/**
 * This class modifies JSON-RPC requests for transactions based on network configurations.
 * It manages parameters such as gas, gas price, chain ID validation, and account details to ensure accurate transaction settings.
 * Additionally, for certain "accounts" scenarios, it can return a response directly.
 * Requests are cloned to prevent interference with other handlers.
 */
export class JsonRpcRequestModifier {
  readonly #provider: EthereumProvider;
  readonly #networkConfig: NetworkConfig;

  // accounts
  #localAccounts: LocalAccounts | undefined;
  #hdWallet: HDWallet | undefined;
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

  /**
   * Processes a JSON-RPC request and conditionally returns a JSON-RPC response if the request matches
   * specific conditions.
   *
   * @param {JsonRpcRequest} jsonRpcRequest - The JSON-RPC request to be processed.
   * @returns {Promise<JsonRpcResponse | null>} - Returns a JSON-RPC response if the conditions are met, or null otherwise.
   */
  public async getResponse(
    jsonRpcRequest: JsonRpcRequest,
  ): Promise<JsonRpcResponse | null> {
    if (isHttpNetworkConfig(this.#networkConfig)) {
      const accounts = this.#networkConfig.accounts;

      if (Array.isArray(accounts)) {
        if (this.#localAccounts === undefined) {
          // TODO: Maybe we can avoid resolving all of them here.
          const resolvedAccounts = await Promise.all(
            accounts.map((acc) => acc.getHexString()),
          );
          this.#localAccounts = new LocalAccounts(
            this.#provider,
            resolvedAccounts,
          );
        }

        return this.#localAccounts.resolveRequest(jsonRpcRequest);
      } else if (this.#isHDAccountsConfig(accounts)) {
        if (this.#hdWallet === undefined) {
          this.#hdWallet = new HDWallet(
            this.#provider,
            accounts.mnemonic,
            accounts.path,
            accounts.initialIndex,
            accounts.count,
            accounts.passphrase,
          );
        }

        return this.#hdWallet.resolveRequest(jsonRpcRequest);
      }
    }

    return null;
  }

  /**
   * Creates a modified copy of a JSON-RPC request by cloning the original and applying changes
   * based on account, gas, gas price, and chain ID configurations if the request matches
   * specific conditions.
   *
   * @param {JsonRpcRequest} jsonRpcRequest - The JSON-RPC request to be cloned and modified.
   * @returns {Promise<JsonRpcRequest>} - A modified JSON-RPC request based on the current configurations.
   */
  public async createModifiedJsonRpcRequest(
    jsonRpcRequest: JsonRpcRequest,
  ): Promise<JsonRpcRequest> {
    // We clone the request to avoid interfering with other hook handlers that
    // might be using the original request.
    // The "newJsonRpcRequest" inside this class is modified by reference.
    const newJsonRpcRequest = await deepClone(jsonRpcRequest);

    await this.#validateChainIdIfNeeded(newJsonRpcRequest);

    await this.#modifyGasAndGasPriceIfNeeded(newJsonRpcRequest);

    await this.#modifyAccountsIfNeeded(newJsonRpcRequest);

    return newJsonRpcRequest;
  }

  async #modifyAccountsIfNeeded(jsonRpcRequest: JsonRpcRequest): Promise<void> {
    if (isHttpNetworkConfig(this.#networkConfig)) {
      const accounts = this.#networkConfig.accounts;

      if (Array.isArray(accounts)) {
        if (this.#localAccounts === undefined) {
          const resolvedAccounts = await Promise.all(
            accounts.map((acc) => acc.getHexString()),
          );

          this.#localAccounts = new LocalAccounts(
            this.#provider,
            resolvedAccounts,
          );
        }

        await this.#localAccounts.modifyRequest(jsonRpcRequest);
      } else if (this.#isHDAccountsConfig(accounts)) {
        if (this.#hdWallet === undefined) {
          this.#hdWallet = new HDWallet(
            this.#provider,
            accounts.mnemonic,
            accounts.path,
            accounts.initialIndex,
            accounts.count,
            accounts.passphrase,
          );
        }

        await this.#hdWallet.modifyRequest(jsonRpcRequest);
      }
    }

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

  #isHDAccountsConfig(
    accounts?: HttpNetworkAccountsUserConfig,
  ): accounts is HDAccountsUserConfig {
    return accounts !== undefined && Object.keys(accounts).includes("mnemonic");
  }
}
