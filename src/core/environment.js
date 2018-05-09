"use strict";

const Web3 = require("web3");

const { lazyObject } = require("./lazy");
const { getNetworkConfig } = require("./config");
const { getWeb3Instance } = require("./network");
const { runTask } = require("./tasks");
const { TruffleEnvironmentArtifacts } = require("./truffle");
const { promisifyWeb3 } = require("./pweb3");

function injectToGlobal(env) {
  global.env = env;
  for (const [key, value] of Object.entries(env)) {
    global[key] = value;
  }
}

function createEnvironment(config, buidlerArguments) {
  const netConfig = getNetworkConfig(config, buidlerArguments.network);
  const web3 = lazyObject(() => getWeb3Instance(netConfig));
  const pweb3 = lazyObject(() => promisifyWeb3(web3));

  const env = {
    config,
    buidlerArguments,
    Web3,
    web3,
    pweb3,
    artifacts: new TruffleEnvironmentArtifacts(config, web3, netConfig)
  };

  env.run = (name, taskArguments, _buidlerArguments = buidlerArguments) =>
    runTask(env, name, taskArguments, _buidlerArguments);
  env.injectToGlobal = injectToGlobal.bind(undefined, env);

  return env;
}

module.exports = { createEnvironment };
