import type { NetworkConfig, NetworkConfigOverride } from "./config.js";
import type { EthereumProvider } from "./providers.js";

/**
 * Represents the possible chain types for the network. The options are:
 * - `GenericNetowrkType`: Represents the most generic type of network.
 * - `"l1"`: Represents Layer 1 networks like Ethereum.
 * - `"optimism"`: Represents Layer 2 networks like Optimism.
 */
export type ChainType = GenericChainType | "l1" | "optimism";

/**
 * The most generic chanin type.
 */
export type GenericChainType = "generic";

/**
 * Determines the default chain type to use when no chain type is specified.
 * The default chain type is GenericNetowrkType by default. You can customize the
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

export type NetworkConnectionParams<
  ChainTypeT extends ChainType | string = DefaultChainType,
> = NetworkConfigOverride & {
  networkName?: string;
  chainType?: ChainTypeT;
};

export interface NetworkManager {
  connect<ChainTypeT extends ChainType | string = DefaultChainType>(
    networkConnectionParams?: NetworkConnectionParams<ChainTypeT>,
  ): Promise<NetworkConnection<ChainTypeT>>;
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
