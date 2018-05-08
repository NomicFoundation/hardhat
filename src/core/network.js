"use strict";

const Web3 = require("web3");

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

function getWeb3Instance(config) {
  const provider = getWeb3Provider(config);

  return new Web3(provider);
}

module.exports = { getWeb3Instance };
