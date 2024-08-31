import type { NetworkConnection } from "./types.js";
import type {
  ChainType,
  DefaultChainType,
  NetworkConfig,
} from "../../../types/config.js";
import type { HookManager } from "../../../types/hooks.js";
import type { EthereumProvider } from "../../../types/providers.js";

import { HardhatError } from "@ignored/hardhat-vnext-errors";

import { HttpProvider } from "./http-provider.js";
import { NetworkConnectionImplementation } from "./network-connection.js";
import { isNetworkConfig } from "./type-validation.js";

export class NetworkManagerImplementation {
  readonly #defaultNetwork: string;
  readonly #defaultChainType: DefaultChainType;
  readonly #networkConfigs: Record<string, NetworkConfig>;
  readonly #hookManager: HookManager;

  #nextConnectionId = 0;

  constructor(
    defaultNetwork: string,
    defaultChainType: DefaultChainType,
    networkConfigs: Record<string, NetworkConfig>,
    hookManager: HookManager,
  ) {
    this.#defaultNetwork = defaultNetwork;
    this.#defaultChainType = defaultChainType;
    this.#networkConfigs = networkConfigs;
    this.#hookManager = hookManager;
  }

  public async connect<
    ChainTypeT extends ChainType | string = DefaultChainType,
  >(
    networkName?: string,
    chainType?: ChainTypeT,
    networkConfigOverride?: Partial<NetworkConfig>,
  ): Promise<NetworkConnection<ChainTypeT>> {
    const networkConnection = await this.#hookManager.runHandlerChain(
      "network",
      "newConnection",
      [],
      async (_context) =>
        this.#initializeNetworkConnection(
          networkName,
          chainType,
          networkConfigOverride,
        ),
    );

    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    -- Cast to NetworkConnection<ChainTypeT> because we know it's valid */
    return networkConnection as NetworkConnection<ChainTypeT>;
  }

  async #initializeNetworkConnection<ChainTypeT extends ChainType | string>(
    networkName?: string,
    chainType?: ChainTypeT,
    networkConfigOverride?: Partial<NetworkConfig>,
  ): Promise<NetworkConnection<ChainTypeT>> {
    const resolvedNetworkName = networkName ?? this.#defaultNetwork;
    if (this.#networkConfigs[resolvedNetworkName] === undefined) {
      throw new HardhatError(HardhatError.ERRORS.NETWORK.NETWORK_NOT_FOUND, {
        networkName: resolvedNetworkName,
      });
    }

    if (
      networkConfigOverride !== undefined &&
      networkConfigOverride.type !==
        this.#networkConfigs[resolvedNetworkName].type
    ) {
      throw new HardhatError(
        HardhatError.ERRORS.NETWORK.INVALID_CONFIG_OVERRIDE,
        {
          errors: `\t* The type of the network cannot be changed.`,
        },
      );
    }

    const resolvedNetworkConfig = {
      ...this.#networkConfigs[resolvedNetworkName],
      ...networkConfigOverride,
    };

    if (!isNetworkConfig(resolvedNetworkConfig)) {
      // TODO: how can we get the errors from the validation?
      throw new HardhatError(
        HardhatError.ERRORS.NETWORK.INVALID_CONFIG_OVERRIDE,
        {
          errors: `\t* The network config is invalid.`,
        },
      );
    }

    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    -- Cast to ChainTypeT because we know it's valid */
    const resolvedChainType = (chainType ??
      resolvedNetworkConfig.chainType ??
      this.#defaultChainType) as ChainTypeT;

    /**
     * If resolvedNetworkConfig.chainType is defined, it must match the
     * provided chainType.
     * We use resolvedChainType as it will be either chainType or
     * resolvedNetworkConfig.chainType in this context.
     */
    if (
      resolvedNetworkConfig.chainType !== undefined &&
      resolvedChainType !== resolvedNetworkConfig.chainType
    ) {
      throw new HardhatError(HardhatError.ERRORS.NETWORK.INVALID_CHAIN_TYPE, {
        networkName: resolvedNetworkName,
        chainType: resolvedChainType,
        networkChainType: resolvedNetworkConfig.chainType,
      });
    }

    const createProvider = async (
      networkConnection: NetworkConnectionImplementation<ChainTypeT>,
    ): Promise<EthereumProvider> => {
      if (resolvedNetworkConfig.type !== "http") {
        /* eslint-disable-next-line no-restricted-syntax -- TODO implement EDR provider */
        throw new Error("Only HTTP network is supported for now");
      }

      return HttpProvider.create({
        url: resolvedNetworkConfig.url,
        networkName: resolvedNetworkName,
        extraHeaders: resolvedNetworkConfig.httpHeaders,
        timeout: resolvedNetworkConfig.timeout,
        jsonRpcRequestWrapper: (request, defaultBehavior) =>
          this.#hookManager.runHandlerChain(
            "network",
            "onRequest",
            [networkConnection, request],
            async (_context, _connection, req) => defaultBehavior(req),
          ),
      });
    };

    return NetworkConnectionImplementation.create(
      this.#nextConnectionId++,
      resolvedNetworkName,
      resolvedChainType,
      resolvedNetworkConfig,
      async (connection: NetworkConnectionImplementation<ChainTypeT>) => {
        await this.#hookManager.runHandlerChain(
          "network",
          "closeConnection",
          [connection],
          async (_context, conn) => {
            await conn.provider.close();
          },
        );
      },
      createProvider,
    );
  }
}
