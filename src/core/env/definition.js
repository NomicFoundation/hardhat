"use strict";

const importLazy = require('import-lazy')(require);
const Web3 = importLazy("web3");

const { applyExtensions } = require("./extensions");
const { lazyObject } = require("../../util/lazy");
const { getNetworkConfig } = require("../config");
const { getWeb3Instance } = require("../web3/network");
const { runTask } = require("../tasks/dsl");
const { TruffleEnvironmentArtifacts } = require("../truffle");
const { promisifyWeb3 } = require("../web3/pweb3");

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

  applyExtensions(env, config);

  return env;
}

module.exports = { createEnvironment };
