import type { CoverageConfig } from "./edr/types/coverage.js";
import type { ArtifactManager } from "../../../types/artifacts.js";
import type {
  ChainDescriptorsConfig,
  HardhatUserConfig,
  NetworkConfig,
  NetworkConfigOverride,
} from "../../../types/config.js";
import type { HookManager } from "../../../types/hooks.js";
import type {
  ChainType,
  DefaultChainType,
  JsonRpcServer,
  NetworkConnection,
  CachedNetworkConnectionParams,
  NetworkConnectionParams,
  NetworkManager,
} from "../../../types/network.js";
import type { HardhatPlugin } from "../../../types/plugins.js";
import type {
  EthereumProvider,
  JsonRpcRequest,
  JsonRpcResponse,
} from "../../../types/providers.js";
import type { ContractDecoder, GasReportConfig } from "@nomicfoundation/edr";

import {
  HardhatError,
  assertHardhatInvariant,
} from "@nomicfoundation/hardhat-errors";
import { exists, readBinaryFile } from "@nomicfoundation/hardhat-utils/fs";
import { deepMerge } from "@nomicfoundation/hardhat-utils/lang";
import { AsyncMutex } from "@nomicfoundation/hardhat-utils/synchronization";

import { resolveUserConfigToHardhatConfig } from "../../core/hre.js";
import { isSupportedChainType } from "../../edr/chain-type.js";
import { JsonRpcServerImplementation } from "../node/json-rpc/server.js";

import { EdrProvider } from "./edr/edr-provider.js";
import { getHardforks } from "./edr/types/hardfork.js";
import { edrGasReportToHardhatGasMeasurements } from "./edr/utils/convert-to-edr.js";
import { verbosityToIncludeTraces } from "./edr/utils/trace-formatters.js";
import { HttpProvider } from "./http-provider.js";
import { NetworkConnectionImplementation } from "./network-connection.js";

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
  readonly #userConfig: Readonly<HardhatUserConfig>;
  readonly #chainDescriptors: Readonly<ChainDescriptorsConfig>;
  readonly #userProvidedConfigPath: Readonly<string | undefined>;
  readonly #projectRoot: string;
  readonly #verbosity: number;

  #connectCalled = false;

  #nextConnectionId = 0;
  readonly #contractDecoderMutex = new AsyncMutex();
  #contractDecoder: ContractDecoder | undefined;

  readonly #getOrCreateMutex = new AsyncMutex();
  readonly #getOrCreateCache = new Map<
    string,
    Map<string, NetworkConnection<ChainType | string>>
  >();

  constructor(
    defaultNetwork: string,
    defaultChainType: DefaultChainType,
    networkConfigs: Record<string, NetworkConfig>,
    hookManager: HookManager,
    artifactsManager: ArtifactManager,
    userConfig: HardhatUserConfig,
    chainDescriptors: ChainDescriptorsConfig,
    userProvidedConfigPath: string | undefined,
    projectRoot: string,
    verbosity: number,
  ) {
    this.#defaultNetwork = defaultNetwork;
    this.#defaultChainType = defaultChainType;
    this.#networkConfigs = networkConfigs;
    this.#hookManager = hookManager;
    this.#artifactsManager = artifactsManager;
    this.#userConfig = userConfig;
    this.#chainDescriptors = chainDescriptors;
    this.#userProvidedConfigPath = userProvidedConfigPath;
    this.#projectRoot = projectRoot;
    this.#verbosity = verbosity;
  }

  public async create<ChainTypeT extends ChainType | string = DefaultChainType>(
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

  public async connect<
    ChainTypeT extends ChainType | string = DefaultChainType,
  >(
    networkOrParams?: NetworkConnectionParams<ChainTypeT> | string,
  ): Promise<NetworkConnection<ChainTypeT>> {
    this.#connectCalled = true;

    return this.create(networkOrParams);
  }

  public async getOrCreate<
    ChainTypeT extends ChainType | string = DefaultChainType,
  >(
    networkOrParams?: CachedNetworkConnectionParams<ChainTypeT> | string,
  ): Promise<NetworkConnection<ChainTypeT>> {
    let network: string | undefined;
    let chainType: ChainTypeT | undefined;

    if (typeof networkOrParams === "string") {
      network = networkOrParams;
    } else if (networkOrParams !== undefined) {
      network = networkOrParams.network;
      chainType = networkOrParams.chainType;

      if ("override" in networkOrParams) {
        throw new HardhatError(
          HardhatError.ERRORS.CORE.NETWORK.INVALID_CONFIG_OVERRIDE,
          {
            errors: "\t* Config overrides are not supported by getOrCreate.",
          },
        );
      }
    }

    const { resolvedNetworkName, resolvedChainType } =
      this.#resolveNetworkAndChainType(network, chainType);

    const cached = this.#getOrCreateCache
      .get(resolvedNetworkName)
      ?.get(resolvedChainType);
    if (cached !== undefined) {
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      -- Cast is safe: the cache keys guarantee the chain type matches */
      return cached as NetworkConnection<ChainTypeT>;
    }

    return this.#getOrCreateMutex.exclusiveRun(async () => {
      // Double-check after acquiring the mutex — another call may have
      // populated the cache while we were waiting.
      const cachedAfterWaiting = this.#getOrCreateCache
        .get(resolvedNetworkName)
        ?.get(resolvedChainType);
      if (cachedAfterWaiting !== undefined) {
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        -- Cast is safe: the cache keys guarantee the chain type matches */
        return cachedAfterWaiting as NetworkConnection<ChainTypeT>;
      }

      const connection = await this.create({
        network: resolvedNetworkName,
        chainType: resolvedChainType,
      });

      let networkCache = this.#getOrCreateCache.get(resolvedNetworkName);
      if (networkCache === undefined) {
        networkCache = new Map();
        this.#getOrCreateCache.set(resolvedNetworkName, networkCache);
      }
      networkCache.set(resolvedChainType, connection);

      return connection;
    });
  }

  public async createServer<
    ChainTypeT extends ChainType | string = DefaultChainType,
  >(
    networkOrParams?: NetworkConnectionParams<ChainTypeT> | string,
    _hostname?: string,
    port?: number,
  ): Promise<JsonRpcServer> {
    this.#ensureNetworkOrParamsIsNotHttpNetworkConfig(networkOrParams);

    const insideDocker = await exists("/.dockerenv");
    const hostname = _hostname ?? (insideDocker ? "0.0.0.0" : "127.0.0.1");

    const { provider } = await this.create(networkOrParams);

    return new JsonRpcServerImplementation({
      hostname,
      port,
      provider,
    });
  }

  /**
   * Returns whether the deprecated `connect` method has been called on this
   * instance. It is not on the public NetworkManager interface as it is only
   * used by the CLI to print a deprecation warning at exit.
   *
   * @returns whether the deprecated `connect` method has ever been called
   */
  public wasConnectCalled(): boolean {
    return this.#connectCalled;
  }

  async #initializeNetworkConnection<ChainTypeT extends ChainType | string>(
    networkName?: string,
    chainType?: ChainTypeT,
    networkConfigOverride?: NetworkConfigOverride,
  ): Promise<NetworkConnection<ChainTypeT>> {
    const { resolvedNetworkName, resolvedChainType } =
      this.#resolveNetworkAndChainType(networkName, chainType);

    const resolvedNetworkConfig = await this.#resolveNetworkConfig(
      resolvedNetworkName,
      networkConfigOverride,
      resolvedChainType,
    );

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

      if (resolvedNetworkConfig.type === "edr-simulated") {
        if (!isSupportedChainType(resolvedChainType)) {
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
            onCollectedCoverageCallback: async (coverageData: Uint8Array[]) => {
              // NOTE: We cast the tag we receive from EDR to a hex string to
              // make it easier to debug.
              const tags = coverageData.map((tag) =>
                Buffer.from(tag).toString("hex"),
              );
              await hookManager.runParallelHandlers(
                "network",
                "onCoverageData",
                [tags],
              );
            },
          };
        }

        let gasReportConfig: GasReportConfig | undefined;
        const shouldEnableGasStats = await hookManager.hasHandlers(
          "network",
          "onGasMeasurement",
        );
        if (shouldEnableGasStats) {
          gasReportConfig = {
            onCollectedGasReportCallback: async (gasReport) => {
              const gasMeasurements =
                edrGasReportToHardhatGasMeasurements(gasReport);

              for (const measurement of gasMeasurements) {
                await hookManager.runParallelHandlers(
                  "network",
                  "onGasMeasurement",
                  [measurement],
                );
              }
            },
          };
        }

        // We load the build infos and their outputs to create a contract
        // decoder when the first provider is created. Successive providers will
        // reuse the same decoder as a performance optimization.
        //
        // The trade-off here is that if you create an EDR provider, then
        // compile new contracts, and create a new provider, the new contracts
        // won't be loaded.
        //
        // Even without this optimization, we already had the problem of new
        // contracts not being visible to existing providers.
        //
        // In practice, most workflows compile everything before creating
        // any network connection.
        if (this.#contractDecoder === undefined) {
          // We want to ensure that only one contract decoder is created so we
          // protect the initialization with a mutex.
          await this.#contractDecoderMutex.exclusiveRun(async () => {
            // We check again if the decoder is undefined because another async
            // execution context could have already initialized it while we were
            // waiting for the mutex.
            if (this.#contractDecoder === undefined) {
              this.#contractDecoder = await EdrProvider.createContractDecoder({
                buildInfos: await this.#getBuildInfosAndOutputsAsBuffers(),
                ignoreContracts: false,
              });
            }
          });
        }

        assertHardhatInvariant(
          this.#contractDecoder !== undefined,
          "Contract decoder should have been initialized before creating the provider",
        );

        const includeCallTraces = verbosityToIncludeTraces(this.#verbosity);

        return EdrProvider.create({
          chainDescriptors: this.#chainDescriptors,
          // The resolvedNetworkConfig can have its chainType set to `undefined`
          // so we default to the default chain type here.
          networkConfig: {
            ...resolvedNetworkConfig,
            // When coverage is enabled, we set allowUnlimitedContractSize to true
            // because the added coverage data can push the contract size over the limit.
            allowUnlimitedContractSize: shouldEnableCoverage
              ? true
              : resolvedNetworkConfig.allowUnlimitedContractSize,
            chainType: resolvedChainType,
          },
          jsonRpcRequestWrapper,
          contractDecoder: this.#contractDecoder,
          coverageConfig,
          gasReportConfig,
          includeCallTraces,
          connectionId: networkConnection.id,
          networkName: networkConnection.networkName,
          verbosity: this.#verbosity,
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

  /**
   * Resolve the network connection configuration settings for the network name
   * and taking into account any configuration overrides.
   *
   * @param resolvedNetworkName the network name for selecting the appropriate network config
   * @param networkConfigOverride any network config options to override the
   *   defaults for the named network
   * @returns a valid network configuration including any config additions from
   *   plugins
   */
  async #resolveNetworkConfig<ChainTypeT extends ChainType | string>(
    resolvedNetworkName: string,
    networkConfigOverride: NetworkConfigOverride = {},
    resolvedChainType: ChainTypeT,
  ): Promise<NetworkConfig> {
    const existingNetworkConfig = this.#networkConfigs[resolvedNetworkName];

    const hasNoOverrides = Object.keys(networkConfigOverride).length === 0;
    const isChainTypeUnchanged =
      resolvedChainType === existingNetworkConfig.chainType;
    const isChainTypeDefault =
      existingNetworkConfig.chainType === undefined &&
      resolvedChainType === this.#defaultChainType;

    if (hasNoOverrides && isChainTypeUnchanged) {
      return existingNetworkConfig;
    }

    if (hasNoOverrides && isChainTypeDefault) {
      return {
        ...existingNetworkConfig,
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions --
          TypeScript can't follow this case, but we are just providing the
          default */
        chainType: resolvedChainType as ChainType,
      };
    }

    if (
      "type" in networkConfigOverride &&
      networkConfigOverride.type !== existingNetworkConfig.type
    ) {
      throw new HardhatError(
        HardhatError.ERRORS.CORE.NETWORK.INVALID_CONFIG_OVERRIDE,
        {
          errors: `\t* The type of the network cannot be changed.`,
        },
      );
    }

    if (
      "chainType" in networkConfigOverride &&
      networkConfigOverride.chainType !== existingNetworkConfig.chainType
    ) {
      throw new HardhatError(
        HardhatError.ERRORS.CORE.NETWORK.INVALID_CONFIG_OVERRIDE,
        {
          errors: `\t* The chainType cannot be specified in config overrides. Pass it at the top level instead: hre.network.create({ chainType: 'op' })`,
        },
      );
    }

    const userConfigWithOverrides = deepMerge(this.#userConfig, {
      networks: {
        [resolvedNetworkName]: {
          ...networkConfigOverride,
          chainType: resolvedChainType,
        },
      },
    });

    // This is safe, the plugins used in resolution are registered
    // with the hook handler, this property is only used for
    // ensuring the original plugins are available at the end
    // of resolution.
    const resolvedPlugins: HardhatPlugin[] = [];

    const configResolutionResult = await resolveUserConfigToHardhatConfig(
      userConfigWithOverrides,
      this.#hookManager,
      this.#projectRoot,
      this.#userProvidedConfigPath,
      resolvedPlugins,
    );

    if (!configResolutionResult.success) {
      if (configResolutionResult.configValidationErrors !== undefined) {
        throw new HardhatError(
          HardhatError.ERRORS.CORE.NETWORK.INVALID_CONFIG_OVERRIDE,
          {
            errors: `\t${configResolutionResult.configValidationErrors
              .map(
                (error) =>
                  `* Error in resolved config ${error.path.join(".")}: ${error.message}`,
              )
              .join("\n\t")}`,
          },
        );
      }

      throw new HardhatError(
        HardhatError.ERRORS.CORE.NETWORK.INVALID_CONFIG_OVERRIDE,
        {
          errors: `\t${configResolutionResult.userConfigValidationErrors
            .map((error) => {
              const path = this.#normaliseErrorPathToNetworkConfig(
                error.path,
                resolvedNetworkName,
              );

              let errorMessage = error.message;
              // When chainType is changed but the network has a configured hardfork,
              // provide a specific message explaining the hardfork must also be updated
              if (path[0] === "hardfork") {
                errorMessage =
                  `Your configured hardfork is incompatible with chainType ${resolvedChainType}. ` +
                  `You need to update the hardfork in your network config or pass a valid hardfork ` +
                  `in the overrides when connecting to the network. ` +
                  `Valid hardforks for chainType ${resolvedChainType} are: ` +
                  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
                  -- We know resolvedChainType is a valid ChainType */
                  `${getHardforks(resolvedChainType as ChainType).join(", ")}.`;
              }

              return path.length > 0
                ? `* Error in ${path.join(".")}: ${errorMessage}`
                : `* ${errorMessage}`;
            })
            .join("\n\t")}`,
        },
      );
    }

    const resolvedNetworkConfigOverride =
      configResolutionResult.config.networks[resolvedNetworkName];

    assertHardhatInvariant(
      resolvedNetworkConfigOverride !== undefined,
      "The overridden network config should translate through the hook resolution of user config",
    );

    return resolvedNetworkConfigOverride;
  }

  #resolveNetworkAndChainType<
    ChainTypeT extends ChainType | string = DefaultChainType,
  >(
    network: string | undefined,
    chainType: ChainTypeT | undefined,
  ): { resolvedNetworkName: string; resolvedChainType: ChainTypeT } {
    const resolvedNetworkName = network ?? this.#defaultNetwork;
    const existingNetworkConfig = this.#networkConfigs[resolvedNetworkName];

    if (existingNetworkConfig === undefined) {
      throw new HardhatError(
        HardhatError.ERRORS.CORE.NETWORK.NETWORK_NOT_FOUND,
        {
          networkName: resolvedNetworkName,
        },
      );
    }

    const resolvedChainType =
      chainType ?? existingNetworkConfig.chainType ?? this.#defaultChainType;

    return {
      resolvedNetworkName,
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      -- The cast is safe because the fallback values are valid chain
      types that match the caller's expected type at runtime. */
      resolvedChainType: resolvedChainType as ChainTypeT,
    };
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

  #normaliseErrorPathToNetworkConfig(
    path: Array<string | number>,
    resolvedNetworkName: string,
  ): Array<string | number> {
    if (path[0] !== undefined && path[0] === "networks") {
      path = path.slice(1);
    }

    if (path[0] !== undefined && path[0] === resolvedNetworkName) {
      path = path.slice(1);
    }

    return path;
  }

  #ensureNetworkOrParamsIsNotHttpNetworkConfig(
    networkOrParams?: NetworkConnectionParams<string> | string,
  ) {
    const networkName =
      typeof networkOrParams === "string"
        ? networkOrParams
        : networkOrParams?.network ?? this.#defaultNetwork;

    const networkConfig = this.#networkConfigs[networkName];

    if (networkConfig === undefined || networkConfig.type === "edr-simulated") {
      return;
    }

    throw new HardhatError(
      HardhatError.ERRORS.CORE.NETWORK.CREATE_SERVER_UNSUPPORTED_NETWORK_TYPE,
      {
        networkName,
        networkType: networkConfig.type,
      },
    );
  }
}
