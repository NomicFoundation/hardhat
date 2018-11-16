"use strict";

import { BuidlerError, ERRORS } from "../errors";

const importLazy = require("import-lazy")(require);
const Web3 = importLazy("web3");
const BigNumber = importLazy("bignumber.js");

function getWeb3Provider(networkName, networkConfig) {
  if (networkConfig.provider) {
    if (networkConfig.provider instanceof Function) {
      return networkConfig.provider();
    }

    return networkConfig.provider;
  }

  const port = networkConfig.port || "8545";

  if (networkConfig.host === undefined) {
    throw new BuidlerError(ERRORS.NETWORK_HAS_NO_HOST, networkName);
  }

  const url = `http://${networkConfig.host}:${port}`;

  return new Web3.providers.HttpProvider(url);
}

export function getWeb3Instance(networkName, netConfig) {
  const provider = getWeb3Provider(networkName, netConfig);

  return new Web3(provider);
}

function createGanacheProvider(ganacheOptions) {
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

export function createAutoNetwork(netConfig) {
  let netConfigOptions = {
    gasLimit: netConfig.blockGasLimit,
    network_id: 4447,
    mnemonic: undefined,
    accounts: undefined
  };

  if (netConfig.accounts === undefined || netConfig.accounts.length === 0) {
    netConfigOptions.mnemonic =
      "candy maple cake sugar pudding cream honey rich smooth crumble sweet treat";
  } else {
    netConfigOptions.accounts = netConfig.accounts.map(acc => ({
      balance: "0x" + new BigNumber(acc.balance).toString(16),
      secretKey: acc.privateKey
    }));
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
  provider.send = (payload, callback) => {
    if (callback === undefined) {
      throw new BuidlerError(ERRORS.NETWORK_AUTO_NO_SYNC);
    }

    originalSend.call(provider, payload, callback);
  };

  return provider;
}
