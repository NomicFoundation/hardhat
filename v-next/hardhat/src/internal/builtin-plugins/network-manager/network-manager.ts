import type {
  EdrNetworkUserConfig,
  HttpNetworkUserConfig,
  NetworkConfig,
  NetworkConfigOverride,
  NetworkUserConfig,
} from "../../../types/config.js";
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

import { resolveConfigurationVariable } from "../../core/configuration-variables.js";

import { resolveNetworkConfigOverride } from "./config-resolution.js";
import { EdrProvider } from "./edr/edr-provider.js";
import { isEdrSupportedChainType } from "./edr/utils/chain-type.js";
import { HttpProvider } from "./http-provider.js";
import { NetworkConnectionImplementation } from "./network-connection.js";
import { validateNetworkConfigOverride } from "./type-validation.js";

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
    networkConfigOverride?: NetworkConfigOverride,
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
    networkConfigOverride?: NetworkConfigOverride,
  ): Promise<NetworkConnection<ChainTypeT>> {
    const resolvedNetworkName = networkName ?? this.#defaultNetwork;
    if (this.#networkConfigs[resolvedNetworkName] === undefined) {
      throw new HardhatError(HardhatError.ERRORS.NETWORK.NETWORK_NOT_FOUND, {
        networkName: resolvedNetworkName,
      });
    }

    let resolvedNetworkConfigOverride: Partial<NetworkConfig> | undefined;
    if (networkConfigOverride !== undefined) {
      if (
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

      const normalizedNetworkConfigOverride =
        await normalizeNetworkConfigOverride(
          networkConfigOverride,
          this.#networkConfigs[resolvedNetworkName],
        );

      // As normalizeNetworkConfigOverride is not type-safe, we validate the
      // normalized network config override immediately after normalizing it.
      const validationErrors = await validateNetworkConfigOverride(
        normalizedNetworkConfigOverride,
      );
      if (validationErrors.length > 0) {
        throw new HardhatError(
          HardhatError.ERRORS.NETWORK.INVALID_CONFIG_OVERRIDE,
          {
            errors: `\t${validationErrors
              .map((error) =>
                error.path.length > 0
                  ? `* Error in ${error.path.join(".")}: ${error.message}`
                  : `* ${error.message}`,
              )
              .join("\n\t")}`,
          },
        );
      }

      resolvedNetworkConfigOverride = resolveNetworkConfigOverride(
        normalizedNetworkConfigOverride,
        (strOrConfigVar) =>
          resolveConfigurationVariable(this.#hookManager, strOrConfigVar),
      );
    }

    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    -- Cast to NetworkConfig as we know the types match, but TS can't infer it */
    const resolvedNetworkConfig = {
      ...this.#networkConfigs[resolvedNetworkName],
      ...resolvedNetworkConfigOverride,
    } as NetworkConfig;

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

/**
 * Converts the NetworkConfigOverride into a valid NetworkUserConfig. This
 * function determines the network type based on the provided `networkConfig`
 * and sets default values for any required properties that are missing from
 * the `networkConfigOverride`.
 *
 * @warning
 * This function is not type-safe. It assumes that `networkConfigOverride` does
 * not contain mixed properties from different network types. Always validate
 * the resulting NetworkUserConfig before using it.
 *
 * @param networkConfigOverride The partial configuration override provided by
 * the user.
 * @param networkConfig The base network configuration used to infer defaults
 * and the network type.
 * @returns A fully resolved NetworkUserConfig with defaults applied.
 */
async function normalizeNetworkConfigOverride(
  networkConfigOverride: NetworkConfigOverride,
  networkConfig: NetworkConfig,
): Promise<NetworkUserConfig> {
  let networkConfigOverrideWithType: NetworkUserConfig;

  if (networkConfig.type === "http") {
    const networkConfigOverrideAsHttp =
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      -- Assumes that networkConfigOverride is a HttpNetworkUserConfig. */
      networkConfigOverride as HttpNetworkUserConfig;

    networkConfigOverrideWithType = {
      ...networkConfigOverrideAsHttp,
      type: "http",
      url: networkConfigOverrideAsHttp.url ?? (await networkConfig.url.get()),
    };
  } else {
    const networkConfigOverrideAsEdr =
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      -- Assumes that networkConfigOverride is an EdrNetworkUserConfig. */
      networkConfigOverride as EdrNetworkUserConfig;

    networkConfigOverrideWithType = {
      ...networkConfigOverrideAsEdr,
      type: "edr",
    };
  }

  return networkConfigOverrideWithType;
}
