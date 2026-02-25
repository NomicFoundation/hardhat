import type {
  ChainType,
  DefaultChainType,
  NetworkConnection,
  NetworkConnectionParams,
  NetworkManager,
} from "hardhat/types/network";

import { createNetworkConnectionProxy } from "./create-network-connection-proxy.js";

/**
 * Creates a connectOnBefore function that returns a proxy network connection
 * that is created and closed by adding `before` and `after` hooks
 * to the calling Mocha `describe` block.
 *
 * The created `connectOnBefore` function captures the passed in network manager
 * that will later be exposed as a property.
 *
 * The underlying network connection is setup in the added `before` hook,
 * meaning that it will be available during the subsequent tests.
 *
 * @param networkManager The network manager instance from the HRE
 * @returns A connectOnBefore function
 */
export function createConnectOnBefore(
  networkManager: NetworkManager,
): <ChainTypeT extends ChainType | string = DefaultChainType>(
  networkOrParams?: NetworkConnectionParams<ChainTypeT> | string,
  closeOnAfter?: boolean,
) => NetworkConnection<ChainTypeT> {
  return function connectOnBefore<
    ChainTypeT extends ChainType | string = DefaultChainType,
  >(
    networkOrParams?: NetworkConnectionParams<ChainTypeT> | string,
    closeOnAfter: boolean = true,
  ): NetworkConnection<ChainTypeT> {
    let resolved: NetworkConnection<ChainTypeT> | undefined;

    // Register the Mocha `before` hook to connect before tests run.
    before(async function () {
      resolved = await networkManager.connect(networkOrParams);
    });

    // Optionally tear down after tests.
    after(async function () {
      if (resolved !== undefined && closeOnAfter) {
        await resolved.close();
        resolved = undefined;
      }
    });

    // The root proxy — represents the NetworkConnection itself.
    // When destructured, each accessed property returns a nested proxy
    // that lazily reads from `resolved[prop]`.
    return createNetworkConnectionProxy<ChainTypeT>(() => resolved);
  };
}
