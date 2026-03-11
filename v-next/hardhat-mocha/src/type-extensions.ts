import "hardhat/types/config";

import type {
  ChainType,
  DefaultChainType,
  NetworkConnectionParams,
  NetworkConnection,
} from "hardhat/types/network";
import type { MochaOptions } from "mocha";

declare module "hardhat/types/config" {
  export interface TestPathsUserConfig {
    mocha?: string;
  }

  export interface TestPathsConfig {
    mocha: string;
  }
}

import "hardhat/types/test";
declare module "hardhat/types/test" {
  export interface HardhatTestUserConfig {
    mocha?: MochaOptions;
  }

  export interface HardhatTestConfig {
    mocha: MochaOptions;
  }
}

import "hardhat/types/network";
declare module "hardhat/types/network" {
  export interface NetworkManager<
    ChainTypeT extends ChainType | string = DefaultChainType,
  > {
    mocha: MochaNetworkHelpers<ChainTypeT>;
  }
}

export interface MochaNetworkHelpers<
  ChainTypeT extends ChainType | string = DefaultChainType,
> {
  /**
   * A Mocha test suite helper that returns a proxy network connection
   * and adds a Mocha `before` hook to the surrounding `describe` block
   * that resolves the proxy to a connection before the tests are run.
   * The connection is automatically closed in an `after` hook unless
   * `closeOnAfter` is set to `false`.
   *
   * This is the recommended way to set up a network connection in Hardhat
   * Mocha test suites. The returned proxy allows safe destructuring of
   * `provider`, `ethers`, `networkHelpers`, and other connection properties
   * at the top of a `describe` block — their values resolve when accessed
   * inside a test or hook.
   *
   * @example
   * // Basic usage — connects to the default network:
   * const { provider } = network.mocha.connectOnBefore();
   *
   * it("gets the block number", async function () {
   *   const blockNumber = await provider.request({ method: "eth_blockNumber" });
   * });
   *
   * @example
   * // With ethers and contract deployment:
   * const connection = network.mocha.connectOnBefore();
   *
   * before(async () => {
   *   counter = await connection.ethers.deployContract("Counter");
   * });
   *
   * @example
   * // With a specific network or config overrides:
   * network.mocha.connectOnBefore("localhost");
   * network.mocha.connectOnBefore({ override: { chainId: 333 } });
   *
   * @param networkOrParams - The network to connect to. Can be a network
   * name string, a {@link NetworkConnectionParams} object for full control
   * over network, chain type, and config overrides, or omitted to connect
   * to the default network.
   * @param closeOnAfter - Whether to automatically close the connection in
   * an `after` hook. Defaults to `true`.
   * @returns A proxy to the {@link NetworkConnection} that resolves lazily
   * when its properties are accessed inside a test or hook.
   */
  connectOnBefore(
    networkOrParams?: NetworkConnectionParams<ChainTypeT> | string,
    closeOnAfter?: boolean,
  ): NetworkConnection<ChainTypeT>;

  /**
   * Returns a suite-wide singleton network connection proxy. The connection
   * is created once via a Mocha `before` hook the first time a given
   * network/chainType combination is requested. Subsequent calls with the
   * same arguments return the same proxy.
   *
   * Multiple network/chainType combinations are supported — each gets its
   * own memoized connection. There is no teardown; connections are left for
   * garbage collection when the process exits.
   *
   * @example
   * // In any test file:
   * const { provider } = network.mocha.connectToSingleton();
   *
   * it("gets the block number", async function () {
   *   const blockNumber = await provider.request({ method: "eth_blockNumber" });
   * });
   *
   * @example
   * // With a specific network name and chain type:
   * const connection = network.mocha.connectToSingleton<"l1">("localhost", "l1");
   *
   * @param networkName - The network name from the Hardhat config to connect
   * to. Omit to use the default network.
   * @param chainType - The chain type to use for the connection. Omit to use
   * the default chain type.
   * @returns A proxy to the {@link NetworkConnection} that resolves lazily
   * when its properties are accessed inside a test or hook.
   */
  connectToSingleton(
    networkName?: string,
    chainType?: ChainTypeT,
  ): NetworkConnection<ChainTypeT>;
}
