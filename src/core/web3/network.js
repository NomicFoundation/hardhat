"use strict";

const Web3 = require("web3");
const BigNumber = require("bignumber.js");
const Ganache = require("ganache-core");

function getWeb3Provider(networkConfig) {
  if (networkConfig.provider) {
    if (networkConfig.provider instanceof Function) {
      return networkConfig.provider();
    }

    return networkConfig.provider;
  }

  const port = networkConfig.port || "8545";

  if (networkConfig.host === undefined) {
    throw new Error(`Selected network configuration has no host defined.`);
  }

  const url = `http://${networkConfig.host}:${port}`;

  return new Web3.providers.HttpProvider(url);
}

function getWeb3Instance(netConfig) {
  const provider = getWeb3Provider(netConfig);

  return new Web3(provider);
}

function createAutoNetwork(netConfig) {
  const ganacheOptions = {
    gasLimit: netConfig.blockGasLimit,
    network_id: 4447
  };

  if (netConfig.accounts === undefined || netConfig.accounts.length === 0) {
    ganacheOptions.mnemonic =
      "candy maple cake sugar pudding cream honey rich smooth crumble sweet treat";
  } else {
    ganacheOptions.accounts = netConfig.accounts.map(acc => ({
      balance: "0x" + new BigNumber(acc.balance).toString(16),
      secretKey: acc.privateKey
    }));
  }

  const provider = Ganache.provider(ganacheOptions);

  // Ganache's provider uses web3-provider-engine, which doesn't support
  // sync requests.
  //
  // We could use a Ganache server and a normal HttpProvider, but those
  // are initialized asynchronously, and we create the environment
  // synchronously. This may be changed if we make most things lazily, but
  // not sure if that would work with tests written for truffle.
  const originalSend = provider.send;
  provider.send = (payload, callback) => {
    if (callback === undefined) {
      throw new Error(
        'Network "auto" does not support sync requests. Consider using pweb3 instead.'
      );
    }

    originalSend.call(provider, payload, callback);
  };

  return provider;
}

module.exports = { getWeb3Instance, createAutoNetwork };
