import { BuidlerError, ERRORS } from "../errors";
import {
  AutoNetworkConfig,
  GanacheOptions,
  HttpNetworkConfig,
  NetworkConfig
} from "../../types";

function isHttpNetworkConfig(
  networkConfig: any
): networkConfig is HttpNetworkConfig {
  return networkConfig.host !== undefined;
}

function getWeb3Provider(networkName: string, networkConfig: NetworkConfig) {
  if (isHttpNetworkConfig(networkConfig)) {
    const port = networkConfig.port || 8545;

    if (networkConfig.host === undefined) {
      throw new BuidlerError(ERRORS.NETWORK_HAS_NO_HOST, networkName);
    }

    const url = `http://${networkConfig.host}:${port}`;

    const Web3 = require("web3");
    return new Web3.providers.HttpProvider(url);
  }

  return createAutoNetwork(networkConfig);
}

export function getWeb3Instance(networkName: string, netConfig: NetworkConfig) {
  const provider = getWeb3Provider(networkName, netConfig);

  const Web3 = require("web3");
  return new Web3(provider);
}

function createGanacheProvider(ganacheOptions: GanacheOptions) {
  // Requiring Ganache is slow, that's why we only do it when needed.
  //
  // This function may seem specially odd, and it is:
  //
  //  1. It is only called when someone try to use the lazyObject-proxied web3
  //     from the environment.
  //
  //  2. In some cases the environment is injected to global, setting
  //     global.web3
  //
  //  3. Ganache requires web3-core-requestmanager, which uses global.web3 if
  //     available.
  //
  //  4. That makes the proxy try to initialize web3 again, executing this
  //     function.
  //
  //  5. When trying to require Ganache again it becomes a cyclic dependency,
  //     which is resolved by returning an empty object.

  const globalAsAny = global as any;
  const previousWeb3 = globalAsAny.web3;
  globalAsAny.web3 = undefined;

  const GanacheProvider = require("ganache-core/lib/provider");

  globalAsAny.web3 = previousWeb3;

  return new GanacheProvider(ganacheOptions);
}

export function createAutoNetwork(netConfig: AutoNetworkConfig) {
  let netConfigOptions: GanacheOptions = {
    gasLimit: netConfig.blockGasLimit,
    network_id: 4447
  };

  if (netConfig.accounts === undefined || netConfig.accounts.length === 0) {
    netConfigOptions.mnemonic =
      "candy maple cake sugar pudding cream honey rich smooth crumble sweet treat";
  } else {
    netConfigOptions.accounts = netConfig.accounts.map(acc => {
      const BigNumber = require("bignumber.js");

      return {
        balance: "0x" + new BigNumber(acc.balance).toString(16),
        secretKey: acc.privateKey
      };
    });
  }

  const options = { ...netConfigOptions, ...netConfig.ganacheOptions };

  const provider = createGanacheProvider(options);

  // Ganache's provider uses web3-provider-engine, which doesn't support
  // sync requests.
  //
  // We could use a Ganache server and a normal HttpProvider, but those
  // are initialized asynchronously, and we create the environment
  // synchronously.
  //
  // This may be changed if we make most things lazy, but not sure if that would
  // work with tests written for truffle.
  const originalSend = provider.send;
  provider.send = (payload: any, callback: any) => {
    if (callback === undefined) {
      throw new BuidlerError(ERRORS.NETWORK_AUTO_NO_SYNC);
    }

    originalSend.call(provider, payload, callback);
  };

  return provider;
}
