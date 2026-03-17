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
  export interface NetworkManager {
    mocha: MochaNetworkHelpers;
  }
}

export interface SingletonConnectionParams<
  ChainTypeT extends ChainType | string = DefaultChainType,
> {
  network?: string;
  chainType?: ChainTypeT;
}

export interface MochaNetworkHelpers {
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
  connectOnBefore<ChainTypeT extends ChainType | string = DefaultChainType>(
    networkOrParams?: NetworkConnectionParams<ChainTypeT> | string,
    closeOnAfter?: boolean,
  ): NetworkConnection<ChainTypeT>;

  /**
   * A Mocha test suite helper that returns a singleton proxy network
   * connection. All calls to `connectToSingleton` for the same network name
   * and chain type will receive the same proxy network connection.
   *
   * This helper should be used if you want to share the same network instance
   * across multiple Mocha test files.
   *
   * The proxy will be resolved to a full network connection within the first
   * test suite to use it. Connections are cleaned up at the end of the test
   * suite run.
   *
   * @example
   * // In any test file:
   * const { provider } = network.mocha.connectToSingleton();
   *
   * describe("a test suite", function ()  {
   *   it("gets the block number", async function () {
   *     const blockNumber = await provider.request({ method: "eth_blockNumber" });
   *   });
   * });
   *
   * @example
   * // With a network name:
   * const connection = network.mocha.connectToSingleton("localhost");
   *
   * @example
   * // With a specific network name and chain type:
   * const connection = network.mocha.connectToSingleton({ network: "localhost", chainType: "l1" });
   *
   * @param networkOrParams - The network to connect to. Can be a network
   * name string, a {@link SingletonConnectionParams} object for network and
   * chain type, or omitted to connect to the default network.
   * @returns A proxy to the {@link NetworkConnection} that resolves lazily
   * when its properties are accessed inside a test or hook.
   */
  connectToSingleton<ChainTypeT extends ChainType | string = DefaultChainType>(
    networkOrParams?: SingletonConnectionParams<ChainTypeT> | string,
  ): NetworkConnection<ChainTypeT>;
}
