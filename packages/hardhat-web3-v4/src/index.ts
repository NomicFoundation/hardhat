import { extendEnvironment } from "hardhat/config";
import { lazyFunction, lazyObject } from "hardhat/plugins";

import "./type-extensions";

extendEnvironment((env) => {
  env.Web3 = lazyFunction(() => require("web3").Web3);
  env.web3 = lazyObject(() => {
    const Web3 = require("web3").Web3;
    return new Web3(env.network.provider);
  });
});
