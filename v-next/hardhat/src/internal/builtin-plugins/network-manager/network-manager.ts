import type { NetworkConfig } from "../../../types/config.js";
import type { HookManager } from "../../../types/hooks.js";
import type {
  ChainType,
  DefaultChainType,
  NetworkConnection,
  NetworkManager,
} from "../../../types/network.js";
import type {
  EthereumProvider,
  JsonRpcRequest,
  JsonRpcResponse,
} from "../../../types/providers.js";

import { HardhatError } from "@ignored/hardhat-vnext-errors";

import { EdrProvider } from "./edr/edr-provider.js";
import { isEdrSupportedChainType } from "./edr/utils/chain-type.js";
import { HttpProvider } from "./http-provider.js";
import { NetworkConnectionImplementation } from "./network-connection.js";
import { isNetworkConfig, validateNetworkConfig } from "./type-validation.js";

export type JsonRpcRequestWrapperFunction = (
  request: JsonRpcRequest,
  defaultBehavior: (r: JsonRpcRequest) => Promise<JsonRpcResponse>,
) => Promise<JsonRpcResponse>;

export class NetworkManagerImplementation implements NetworkManager {
  readonly #defaultNetwork: string;
  readonly #defaultChainType: DefaultChainType;
  readonly #networkConfigs: Readonly<Record<string, Readonly<NetworkConfig>>>;
  readonly #hookManager: Readonly<HookManager>;

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
      "type" in networkConfigOverride &&
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
      const validationErrors = validateNetworkConfig(resolvedNetworkConfig);

      throw new HardhatError(
        HardhatError.ERRORS.NETWORK.INVALID_CONFIG_OVERRIDE,
        {
          errors: `\t${validationErrors
            .map(
              (error) => `* Error in ${error.path.join(".")}: ${error.message}`,
            )
            .join("\n\t")}`,
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

    /* Capture the hook manager in a local variable to avoid retaining a
    reference to the NetworkManager instance, allowing the garbage collector
    to clean up the NetworkConnectionImplementation instances properly. */
    const hookManager = this.#hookManager;

    const createProvider = async (
      networkConnection: NetworkConnectionImplementation<ChainTypeT>,
    ): Promise<EthereumProvider> => {
      const jsonRpcRequestWrapper: JsonRpcRequestWrapperFunction = (
        request,
        defaultBehavior,
      ) =>
        hookManager.runHandlerChain(
          "network",
          "onRequest",
          [networkConnection, request],
          async (_context, _connection, req) => defaultBehavior(req),
        );

      if (resolvedNetworkConfig.type === "edr") {
        if (!isEdrSupportedChainType(resolvedChainType)) {
          throw new HardhatError(
            HardhatError.ERRORS.GENERAL.UNSUPPORTED_OPERATION,
            { operation: `Simulating chain type ${resolvedChainType}` },
          );
        }

        return EdrProvider.create({
          // The resolvedNetworkConfig can have its chainType set to `undefined`
          // so we default to the default chain type here.
          networkConfig: {
            ...resolvedNetworkConfig,
            /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions --
            This case is safe because we have a check above */
            chainType: resolvedChainType as ChainType,
          },
          jsonRpcRequestWrapper,
        });
      }

      return HttpProvider.create({
        url: await resolvedNetworkConfig.url.getUrl(),
        networkName: resolvedNetworkName,
        extraHeaders: resolvedNetworkConfig.httpHeaders,
        timeout: resolvedNetworkConfig.timeout,
        jsonRpcRequestWrapper,
      });
    };

    return NetworkConnectionImplementation.create(
      this.#nextConnectionId++,
      resolvedNetworkName,
      resolvedChainType,
      resolvedNetworkConfig,
      async (connection: NetworkConnectionImplementation<ChainTypeT>) => {
        await hookManager.runHandlerChain(
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
