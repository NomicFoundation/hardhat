import type { NetworkConfig, NetworkConfigOverride } from "./config.js";
import type { EthereumProvider } from "./providers.js";

/**
 * Represents the possible chain types for the network. The options are:
 * - `GenericNetworkType`: Represents the most generic type of network.
 * - `"l1"`: Represents Layer 1 networks like Ethereum.
 * - `"op"`: Represents Layer 2 networks like Optimism.
 */
export type ChainType = GenericChainType | "l1" | "op";

/**
 * The most generic chain type.
 */
export type GenericChainType = "generic";

/**
 * Determines the default chain type to use when no chain type is specified.
 * The default chain type is GenericNetworkType by default. You can customize the
 * default chain type by adding a `defaultChainType` property to the
 * `ChainTypeConfig` interface with a valid `ChainType` value.
 * For example:
 * ```ts
 * declare module "hardhat/types/network" {
 *   export interface ChainTypeConfig {
 *     defaultChainType: "l1";
 *   }
 * }
 * ```
 */
export type DefaultChainType = ChainTypeConfig extends {
  defaultChainType: infer T;
}
  ? T extends ChainType
    ? T
    : GenericChainType
  : GenericChainType;

/* eslint-disable-next-line @typescript-eslint/no-empty-interface -- Empty
interface to allow the user to change the default chain type. */
export interface ChainTypeConfig {}

export interface NetworkConnectionParams<
  ChainTypeT extends ChainType | string = DefaultChainType,
> {
  network?: string;
  chainType?: ChainTypeT;
  override?: NetworkConfigOverride;
}

export interface CachedNetworkConnectionParams<
  ChainTypeT extends ChainType | string = DefaultChainType,
> extends NetworkConnectionParams<ChainTypeT> {
  override?: never;
}

export interface NetworkManager {
  /**
   * Creates a new network connection based on the provided parameters.
   *
   * @param networkOrParams The network name or connection parameters. When
   * omitted, the default network is used.
   *
   * @returns A new {@link NetworkConnection} for the specified network.
   */
  create<ChainTypeT extends ChainType | string = DefaultChainType>(
    networkOrParams?: NetworkConnectionParams<ChainTypeT> | string,
  ): Promise<NetworkConnection<ChainTypeT>>;

  /**
   * Creates a new network connection based on the provided parameters.
   *
   * @deprecated Use {@link NetworkManager.create} or
   * {@link NetworkManager.getOrCreate} instead.
   *
   * - {@link NetworkManager.create} always creates a new network instance.
   * - {@link NetworkManager.getOrCreate} returns an existing instance if one exists.
   *
   * `connect` will be removed in a future version of Hardhat.
   *
   * @param networkOrParams The network name or connection parameters. When
   * omitted, the default network is used.
   *
   * @returns A new {@link NetworkConnection} for the specified network.
   */
  connect<ChainTypeT extends ChainType | string = DefaultChainType>(
    networkOrParams?: NetworkConnectionParams<ChainTypeT> | string,
  ): Promise<NetworkConnection<ChainTypeT>>;

  /**
   * Returns an existing network connection if one was previously created
   * with the same network name and chain type. Creates a new one otherwise.
   *
   * @param networkOrParams The network name or connection parameters. When
   * omitted, the default network is used. Overrides are not supported.
   *
   * @returns A {@link NetworkConnection} for the specified network, cached
   * by network name and chain type.
   */
  getOrCreate<ChainTypeT extends ChainType | string = DefaultChainType>(
    networkOrParams?: CachedNetworkConnectionParams<ChainTypeT> | string,
  ): Promise<NetworkConnection<ChainTypeT>>;

  /**
   * Spawns an Ethereum JSON-RPC server listening on HTTP and Websocket.
   *
   * @param networkOrParams The network name or connection parameters.
   * @param hostname Hostname to bind the server to. Defaults to localhost or 0.0.0.0 on docker.
   * @param port Port to listen on. Defaults to a random available port.
   *
   * @return A `JsonRpcServer` instance that can be started with {@link JsonRpcServer.listen}.
   */
  createServer<ChainTypeT extends ChainType | string = DefaultChainType>(
    networkOrParams?: NetworkConnectionParams<ChainTypeT> | string,
    hostname?: string,
    port?: number,
  ): Promise<JsonRpcServer>;
}

export interface NetworkConnection<
  ChainTypeT extends ChainType | string = DefaultChainType,
> {
  readonly id: number;
  readonly networkName: string;
  readonly networkConfig: Readonly<NetworkConfig>;
  readonly chainType: ChainTypeT;
  readonly provider: EthereumProvider;

  close(): Promise<void>;
}

/**
 * An Ethereum JSON-RPC server that accepts connections via HTTP and websocket.
 */
export interface JsonRpcServer {
  /**
   * Starts the Ethereum JSON-RPC server.
   *
   * @returns returns the address and port the server is listening on.
   */
  listen(): Promise<{ address: string; port: number }>;

  /**
   * Closes the Ethereum JSON-RPC server.
   *
   * @returns A promise that resolves once shutdown is finished.
   */
  close(): Promise<void>;

  /**
   * Resolves once the Ethereum JSON-RPC server has been
   * closed, including its underlying HTTP and Websocket sockets.
   *
   * Useful for awaiting a shutdown that was initiated elsewhere.
   *
   * @returns A promise that resolves once the server and
   *   its sockets have been closed.
   */
  afterClosed(): Promise<void>;
}
