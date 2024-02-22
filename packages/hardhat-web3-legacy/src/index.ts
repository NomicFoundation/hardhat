import type { promisifyWeb3 as PromisifyWeb3T } from "./pweb3";

import { extendEnvironment } from "hardhat/config";
import { lazyFunction, lazyObject } from "hardhat/plugins";

import "./type-extensions";
import { Web3HTTPProviderAdapter } from "./web3-provider-adapter";

extendEnvironment((env) => {
  env.Web3 = lazyFunction(() => require("web3"));
  env.web3 = lazyObject(() => {
    const Web3 = require("web3");
    return new Web3(new Web3HTTPProviderAdapter(env.network.provider));
  });
  const { promisifyWeb3 } = require("./pweb3") as {
    promisifyWeb3: typeof PromisifyWeb3T;
  };
  env.pweb3 = lazyObject(() => promisifyWeb3(env.web3));
});
