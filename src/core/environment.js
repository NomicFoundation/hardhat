const Web3 = require("web3");

const { lazyObject } = require("./lazy");
const { getNetworkConfig } = require("./config");
const { getWeb3Instance } = require("./network");
const { deploy, deployByName } = require("./deploy");
const { runTask } = require("./tasks");
const { TruffleEnvironmentArtifacts } = require("./truffle");

const {
  getContract,
  getContractAbi,
  getContractBytecode
} = require("./artifacts");

function injectToGlobal(env) {
  global.env = env;
  for (const [key, value] of Object.entries(env)) {
    global[key] = value;
  }
}

function createEnvironment(config, soolArguments) {
  const netConfig = getNetworkConfig(config, soolArguments.network);
  const web3 = lazyObject(() => getWeb3Instance(netConfig));

  const env = {
    config,
    soolArguments,
    Web3,
    web3,
    getContract: getContract.bind(undefined, config, web3),
    getContractAbi: getContractAbi.bind(undefined, config),
    getContractBytecode: getContractBytecode.bind(undefined, config),
    deploy: deploy.bind(undefined, web3),
    deployByName: deployByName.bind(undefined, web3),
    artifacts: new TruffleEnvironmentArtifacts(config, web3, netConfig)
  };

  env.run = (name, taskArguments, _soolArguments = soolArguments) =>
    runTask(env, name, taskArguments, _soolArguments);
  env.injectToGlobal = injectToGlobal.bind(undefined, env);

  return env;
}

module.exports = { createEnvironment };
