const Web3 = require("web3");

function getWeb3Provider(config) {
  const netConfig = config.selectedNetwork;

  if (netConfig.provider) {
    if (netConfig.provider instanceof Function) {
      return netConfig.provider();
    }

    return netConfig.provider;
  }

  const port = netConfig.port || "8545";

  if (netConfig.host === undefined) {
    throw new Error(`Network ${selectedNetwork} has no host defined.`);
  }

  const url = `http://${netConfig.host}:${port}`;

  return new Web3.providers.HttpProvider(url);
}

function getWeb3Instance(config) {
  const provider = getWeb3Provider(config);

  return new Web3(provider);
}

module.exports = { getWeb3Instance };
