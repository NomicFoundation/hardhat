import type { CoverageConfig } from "./edr/types/coverage.js";
import type { ArtifactManager } from "../../../types/artifacts.js";
import type {
  ChainDescriptorsConfig,
  NetworkConfig,
  NetworkConfigOverride,
  NetworkUserConfig,
} from "../../../types/config.js";
import type { HookManager } from "../../../types/hooks.js";
import type {
  ChainType,
  DefaultChainType,
  NetworkConnection,
  NetworkConnectionParams,
  NetworkManager,
} from "../../../types/network.js";
import type {
  EthereumProvider,
  JsonRpcRequest,
  JsonRpcResponse,
} from "../../../types/providers.js";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { readBinaryFile } from "@nomicfoundation/hardhat-utils/fs";
import { deepMerge } from "@nomicfoundation/hardhat-utils/lang";

import { resolveConfigurationVariable } from "../../core/configuration-variables.js";
import { isEdrSupportedChainType } from "../../edr/chain-type.js";

import { resolveEdrNetwork, resolveHttpNetwork } from "./config-resolution.js";
import { EdrProvider } from "./edr/edr-provider.js";
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
  readonly #artifactsManager: Readonly<ArtifactManager>;
  readonly #userConfigNetworks: Readonly<Record<string, NetworkUserConfig>>;
  readonly #chainDescriptors: Readonly<ChainDescriptorsConfig>;

  #nextConnectionId = 0;

  constructor(
    defaultNetwork: string,
    defaultChainType: DefaultChainType,
    networkConfigs: Record<string, NetworkConfig>,
    hookManager: HookManager,
    artifactsManager: ArtifactManager,
    userConfigNetworks: Record<string, NetworkUserConfig> | undefined,
    chainDescriptors: ChainDescriptorsConfig,
  ) {
    this.#defaultNetwork = defaultNetwork;
    this.#defaultChainType = defaultChainType;
    this.#networkConfigs = networkConfigs;
    this.#hookManager = hookManager;
    this.#artifactsManager = artifactsManager;
    this.#userConfigNetworks = userConfigNetworks ?? {};
    this.#chainDescriptors = chainDescriptors;
  }

  public async connect<
    ChainTypeT extends ChainType | string = DefaultChainType,
  >(
    networkOrParams?: NetworkConnectionParams<ChainTypeT> | string,
  ): Promise<NetworkConnection<ChainTypeT>> {
    let networkName: string | undefined;
    let chainType: ChainTypeT | undefined;
    let override: NetworkConfigOverride | undefined;

    if (typeof networkOrParams === "string") {
      networkName = networkOrParams;
    } else if (networkOrParams !== undefined) {
      networkName = networkOrParams.network;
      chainType = networkOrParams.chainType;
      override = networkOrParams.override;
    }

    const networkConnection = await this.#hookManager.runHandlerChain(
      "network",
      "newConnection",
      [],
      async (_context) =>
        this.#initializeNetworkConnection(networkName, chainType, override),
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
      throw new HardhatError(
        HardhatError.ERRORS.CORE.NETWORK.NETWORK_NOT_FOUND,
        {
          networkName: resolvedNetworkName,
        },
      );
    }

    let resolvedNetworkConfigOverride: NetworkConfig | undefined;
    if (networkConfigOverride !== undefined) {
      if (
        "type" in networkConfigOverride &&
        networkConfigOverride.type !==
          this.#networkConfigs[resolvedNetworkName].type
      ) {
        throw new HardhatError(
          HardhatError.ERRORS.CORE.NETWORK.INVALID_CONFIG_OVERRIDE,
          {
            errors: `\t* The type of the network cannot be changed.`,
          },
        );
      }

      const newConfig = deepMerge(
        this.#userConfigNetworks[resolvedNetworkName],
        networkConfigOverride,
      );

      // As normalizeNetworkConfigOverride is not type-safe, we validate the
      // normalized network config override immediately after normalizing it.
      const validationErrors = await validateNetworkConfigOverride(newConfig);
      if (validationErrors.length > 0) {
        throw new HardhatError(
          HardhatError.ERRORS.CORE.NETWORK.INVALID_CONFIG_OVERRIDE,
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

      resolvedNetworkConfigOverride =
        newConfig.type === "http"
          ? resolveHttpNetwork(newConfig, (strOrConfigVar) =>
              resolveConfigurationVariable(this.#hookManager, strOrConfigVar),
            )
          : resolveEdrNetwork(newConfig, "", (strOrConfigVar) =>
              resolveConfigurationVariable(this.#hookManager, strOrConfigVar),
            );
    }

    const resolvedNetworkConfig =
      resolvedNetworkConfigOverride ??
      this.#networkConfigs[resolvedNetworkName];

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
      throw new HardhatError(
        HardhatError.ERRORS.CORE.NETWORK.INVALID_CHAIN_TYPE,
        {
          networkName: resolvedNetworkName,
          chainType: resolvedChainType,
          networkChainType: resolvedNetworkConfig.chainType,
        },
      );
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
            HardhatError.ERRORS.CORE.GENERAL.UNSUPPORTED_OPERATION,
            { operation: `Simulating chain type ${resolvedChainType}` },
          );
        }

        let coverageConfig: CoverageConfig | undefined;

        const shouldEnableCoverage = await hookManager.hasHandlers(
          "network",
          "onCoverageData",
        );
        if (shouldEnableCoverage) {
          coverageConfig = {
            onCollectedCoverageCallback: (coverageData: Uint8Array[]) => {
              // NOTE: We cast the tag we receive from EDR to a hex string to
              // make it easier to debug.
              const tags = coverageData.map((tag) =>
                Buffer.from(tag).toString("hex"),
              );
              void hookManager.runParallelHandlers(
                "network",
                "onCoverageData",
                [tags],
              );
            },
          };
        }

        return EdrProvider.create({
          chainDescriptors: this.#chainDescriptors,
          // The resolvedNetworkConfig can have its chainType set to `undefined`
          // so we default to the default chain type here.
          networkConfig: {
            ...resolvedNetworkConfig,
            /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions --
            This case is safe because we have a check above */
            chainType: resolvedChainType as ChainType,
          },
          jsonRpcRequestWrapper,
          tracingConfig: {
            buildInfos: await this.#getBuildInfosAndOutputsAsBuffers(),
            ignoreContracts: false,
          },
          coverageConfig,
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

  async #getBuildInfosAndOutputsAsBuffers(): Promise<
    Array<{ buildInfo: Uint8Array; output: Uint8Array }>
  > {
    const results = [];
    for (const id of await this.#artifactsManager.getAllBuildInfoIds()) {
      const buildInfoPath = await this.#artifactsManager.getBuildInfoPath(id);
      const buildInfoOutputPath =
        await this.#artifactsManager.getBuildInfoOutputPath(id);

      if (buildInfoPath !== undefined && buildInfoOutputPath !== undefined) {
        const buildInfo = await readBinaryFile(buildInfoPath);
        const output = await readBinaryFile(buildInfoOutputPath);

        results.push({
          buildInfo,
          output,
        });
      }
    }

    return results;
  }
}
