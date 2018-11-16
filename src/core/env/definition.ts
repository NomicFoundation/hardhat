"use strict";

import { applyExtensions } from "./extensions";

import { lazyObject } from "../../util/lazy";

import { getNetworkConfig } from "../config";

import { getWeb3Instance } from "../web3/network";

import { runTask } from "../tasks/dsl";

import { TruffleEnvironmentArtifacts } from "../truffle";

import { promisifyWeb3 } from "../web3/pweb3";

function injectToGlobal(env) {
  const globalAsAny = global as any;
  globalAsAny.env = env;
  for (const [key, value] of Object.entries(env)) {
    globalAsAny[key] = value;
  }
}

export function createEnvironment(config, buidlerArguments) {
  const netConfig = getNetworkConfig(config, buidlerArguments.network);
  const web3 = lazyObject(() =>
    getWeb3Instance(buidlerArguments.network, netConfig)
  );
  const pweb3 = lazyObject(() => promisifyWeb3(web3));

  const importLazy = require("import-lazy")(require);
  const Web3 = importLazy("web3");

  const env = {
    config,
    buidlerArguments,
    Web3,
    web3,
    pweb3,
    artifacts: new TruffleEnvironmentArtifacts(config, web3, netConfig),
    run:undefined,
    injectToGlobal: undefined
  };

  env.run = (name, taskArguments, _buidlerArguments = buidlerArguments) =>
    runTask(env, name, taskArguments, _buidlerArguments);
  env.injectToGlobal = injectToGlobal.bind(undefined, env);

  applyExtensions(env, config);

  return env;
}
