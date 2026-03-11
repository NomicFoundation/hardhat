import type {
  ChainType,
  DefaultChainType,
  NetworkConnection,
  NetworkManager,
} from "hardhat/types/network";

import { createNetworkConnectionProxy } from "./create-network-connection-proxy.js";

interface SingletonEntry {
  networkName: string | undefined;
  chainType: string | undefined;
  resolved: NetworkConnection | undefined;
  connectPromise: Promise<void> | undefined;
  proxy: unknown;
}

/**
 * Creates a connectToSingleton function that returns a proxy network connection
 * shared across all callers with the same network name and chain type.
 *
 * Unlike `connectOnBefore`, which creates a new connection per `describe` block,
 * `connectToSingleton` memoizes connections by `networkName:chainType` key —
 * only the first call for a given key registers a Mocha `before` hook that
 * connects. Subsequent calls for the same key reuse the same proxy and wait
 * on the same connection promise.
 *
 * There is no teardown — connections are left for garbage collection when the
 * process exits.
 *
 * @param networkManager The network manager instance from the HRE
 * @returns A connectToSingleton function
 */
export function createConnectToSingleton(
  networkManager: NetworkManager,
): <ChainTypeT extends ChainType | string = DefaultChainType>(
  networkName?: string,
  chainType?: ChainTypeT,
) => NetworkConnection<ChainTypeT> {
  const singletons = new Map<string, SingletonEntry>();

  return function connectToSingleton<
    ChainTypeT extends ChainType | string = DefaultChainType,
  >(
    networkName?: string,
    chainType?: ChainTypeT,
  ): NetworkConnection<ChainTypeT> {
    const key = `${networkName ?? ""}:${chainType ?? ""}`;

    const existing = singletons.get(key);
    if (existing !== undefined) {
      // Already registered — register a before() that waits on the same
      // connect promise so this describe block's tests don't start until
      // the connection is ready.
      before(async function () {
        await existing.connectPromise;
      });

      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- The proxy is generic over ChainTypeT
      return existing.proxy as NetworkConnection<ChainTypeT>;
    }

    const entry: SingletonEntry = {
      networkName,
      chainType,
      resolved: undefined,
      connectPromise: undefined,
      proxy: undefined,
    };

    before(async function () {
      entry.connectPromise = (async () => {
        const params =
          networkName !== undefined || chainType !== undefined
            ? { network: networkName, chainType }
            : undefined;

        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- The entry stores an untyped connection; callers cast via the proxy
        entry.resolved = (await networkManager.connect(params)) as NetworkConnection;
      })();
      await entry.connectPromise;
    });

    const proxy = createNetworkConnectionProxy<ChainTypeT>(
      () =>
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- The connection is generic over ChainTypeT
        entry.resolved as NetworkConnection<ChainTypeT> | undefined,
    );
    entry.proxy = proxy;

    singletons.set(key, entry);

    return proxy;
  };
}
