import type { NetworkConnection, NetworkManager } from "./types.js";
import type * as ConfigTypes from "@ignored/hardhat-vnext/types/config";
import type { HookContext } from "@ignored/hardhat-vnext/types/hooks";
import type {
  JsonRpcRequest,
  JsonRpcResponse,
} from "@ignored/hardhat-vnext/types/providers";

import "@ignored/hardhat-vnext/types/config";
declare module "@ignored/hardhat-vnext/types/config" {
  /**
   * Represents the possible chain types for the network. The options are:
   * - `"unknown"`: Represents the most generic type of network.
   * - `"l1"`: Represents Layer 1 networks like Ethereum.
   * - `"optimism"`: Represents Layer 2 networks like Optimism.
   */
  export type ChainType = "unknown" | "l1" | "optimism";

  /**
   * Determines the default chain type to use when no chain type is specified.
   * The default chain type is `"unknown"` by default. You can customize the
   * default chain type by adding a `defaultChainType` property to the
   * `ChainTypeConfig` interface with a valid `ChainType` value.
   * For example:
   * ```ts
   * declare module "@ignored/hardhat-vnext/types/config" {
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
      : "unknown"
    : "unknown";

  /* eslint-disable-next-line @typescript-eslint/no-empty-interface -- Empty
  interface to allow the user to change the default chain type. */
  export interface ChainTypeConfig {}

  export interface HardhatUserConfig {
    defaultNetwork?: string;
    defaultChainType?: DefaultChainType;
    networks?: Record<string, NetworkUserConfig>;
  }

  export interface HardhatConfig {
    defaultNetwork: string;
    defaultChainType: DefaultChainType;
    networks: Record<string, NetworkConfig>;
  }

  export type NetworkUserConfig = HttpNetworkUserConfig | EdrNetworkUserConfig;

  export interface HttpNetworkUserConfig {
    type: "http";
    chainId?: number;
    chainType?: ChainType;
    from?: string;
    gas?: "auto" | number;
    gasMultiplier?: number;
    gasPrice?: "auto" | number;

    // HTTP network specific
    url?: string;
    timeout?: number;
    httpHeaders?: Record<string, string>;
  }

  export interface EdrNetworkUserConfig {
    type: "edr";
    chainId: number;
    chainType?: ChainType;
    from?: string;
    gas: "auto" | number;
    gasMultiplier: number;
    gasPrice: "auto" | number;

    // EDR network specific
  }

  export type NetworkConfig = HttpNetworkConfig | EdrNetworkConfig;

  export interface HttpNetworkConfig {
    type: "http";
    chainId: number;
    chainType?: ChainType;
    from?: string;
    gas: "auto" | number;
    gasMultiplier: number;
    gasPrice: "auto" | number;

    // HTTP network specific
    url: string;
    timeout: number;
    httpHeaders: Record<string, string>;
  }

  export interface EdrNetworkConfig {
    type: "edr";
    chainId: number;
    chainType?: ChainType;
    from: string;
    gas: "auto" | number;
    gasMultiplier: number;
    gasPrice: "auto" | number;

    // EDR network specific
  }
}

import "@ignored/hardhat-vnext/types/hre";
declare module "@ignored/hardhat-vnext/types/hre" {
  export interface HardhatRuntimeEnvironment {
    network: NetworkManager;
  }
}

import "@ignored/hardhat-vnext/types/global-options";
declare module "@ignored/hardhat-vnext/types/global-options" {
  export interface GlobalOptions {
    network: string;
  }
}

import "@ignored/hardhat-vnext/types/hooks";
declare module "@ignored/hardhat-vnext/types/hooks" {
  export interface HardhatHooks {
    network: NetworkHooks;
  }

  export interface NetworkHooks {
    newConnection<ChainTypeT extends ConfigTypes.ChainType | string>(
      context: HookContext,
      next: (
        nextContext: HookContext,
      ) => Promise<NetworkConnection<ChainTypeT>>,
    ): Promise<NetworkConnection<ChainTypeT>>;

    closeConnection<ChainTypeT extends ConfigTypes.ChainType | string>(
      context: HookContext,
      networkConnection: NetworkConnection<ChainTypeT>,
      next: (
        nextContext: HookContext,
        nextNetworkConnection: NetworkConnection<ChainTypeT>,
      ) => Promise<void>,
    ): Promise<void>;

    onRequest<ChainTypeT extends ConfigTypes.ChainType | string>(
      context: HookContext,
      networkConnection: NetworkConnection<ChainTypeT>,
      jsonRpcRequest: JsonRpcRequest,
      next: (
        nextContext: HookContext,
        nextNetworkConnection: NetworkConnection<ChainTypeT>,
        nextJsonRpcRequest: JsonRpcRequest,
      ) => Promise<JsonRpcResponse | JsonRpcResponse[]>,
    ): Promise<JsonRpcResponse | JsonRpcResponse[]>;
  }
}
