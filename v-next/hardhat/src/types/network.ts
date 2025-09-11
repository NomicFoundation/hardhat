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
 * The most generic chanin type.
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

export interface NetworkManager {
  connect<ChainTypeT extends ChainType | string = DefaultChainType>(
    networkOrParams?: NetworkConnectionParams<ChainTypeT> | string,
  ): Promise<NetworkConnection<ChainTypeT>>;

  /**
   * Spawn an Ethereum JSON-RPC server listening on HTTP and Websocket.
   *
   * @param networkOrParams The network name or connection parameters.
   * @param hostname Hostname to bind the server to. Defaults to localhost or 0.0.0.0 on docker.
   * @param port Port to listen on. Defaults to a random available port.
   */
  createServer(
    networkOrParams?: NetworkConnectionParams | string,
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
   * @returns returns the address and port the server is listening on
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
