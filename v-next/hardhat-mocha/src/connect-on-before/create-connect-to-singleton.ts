import type { SingletonConnectionParams } from "../type-extensions.js";
import type {
  ChainType,
  DefaultChainType,
  NetworkConnection,
  NetworkManager,
} from "hardhat/types/network";

import { createNetworkConnectionProxy } from "./create-network-connection-proxy.js";

interface SingletonEntry {
  proxy: NetworkConnection;
  connectPromise: Promise<void> | undefined;
  resolved: NetworkConnection | undefined;
}

const DEFAULT_NETWORK_NAME = "default";
const DEFAULT_CHAIN_TYPE = "generic";

/**
 * Creates a connectToSingleton function that returns a proxy network connection
 * shared across all callers with the same network name and chain type.
 *
 * Unlike `connectOnBefore`, which creates a new connection per `describe` block,
 * `connectToSingleton` memoizes connections by `networkName:chainType` key.
 * Every call registers a Mocha `before` hook that connects if the entry has not
 * yet been resolved and is a no-op otherwise.
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
  networkOrParams?: SingletonConnectionParams<ChainTypeT> | string,
) => NetworkConnection<ChainTypeT> {
  // Scope the persistence of the singleton network connection proxies
  // to the lifetime of this HRE.
  const singletons = new Map<string, SingletonEntry>();

  return function connectToSingleton<
    ChainTypeT extends ChainType | string = DefaultChainType,
  >(
    networkOrParams?: SingletonConnectionParams<ChainTypeT> | string,
  ): NetworkConnection<ChainTypeT> {
    const networkName =
      typeof networkOrParams === "string"
        ? networkOrParams
        : networkOrParams?.network;

    const chainType =
      typeof networkOrParams === "string"
        ? undefined
        : networkOrParams?.chainType;

    const key = `${networkName ?? DEFAULT_NETWORK_NAME}:${chainType ?? DEFAULT_CHAIN_TYPE}`;

    const entry = singletons.get(key) ?? createSingletonEntry(singletons, key);

    // Every call registers a before() — connects if needed, no-op if resolved.
    // The connectPromise is created synchronously in the first before() to
    // execute, so all concurrent hooks await the same promise.
    before(async function () {
      // If the connection has been created, there is nothing to do
      // the proxy connection is resolved and usable
      if (entry.resolved !== undefined) {
        return;
      }

      // in the first before to run, setup the promise to resolve the connection
      if (entry.connectPromise === undefined) {
        const params =
          networkName !== undefined || chainType !== undefined
            ? { network: networkName, chainType }
            : undefined;

        // The setting of connection promise has to happen synchronously
        // to avoid race conditions with other suites' before hooks,
        // hence the then that sets resolved.
        entry.connectPromise = networkManager
          .connect(params)
          .then((connection) => {
            /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions --
            Connection is generically typed, and the entry is not */
            entry.resolved = connection as NetworkConnection;
          });
      }

      // wait for the connection to be resolved
      await entry.connectPromise;
    });

    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions --
       The singletons map erases the ChainTypeT generic, forcing our hand. */
    return entry.proxy as NetworkConnection<ChainTypeT>;
  };
}

function createSingletonEntry(
  singletons: Map<string, SingletonEntry>,
  key: string,
): SingletonEntry {
  const proxy = createNetworkConnectionProxy(() => entry.resolved);

  const entry: SingletonEntry = {
    resolved: undefined,
    connectPromise: undefined,
    proxy,
  };

  singletons.set(key, entry);

  return entry;
}
