import { extendEnvironment } from "hardhat/config";
import { lazyFunction, lazyObject } from "hardhat/plugins";

import "./type-extensions";
import {
  Web3HardhatNetworkProviderAdapter,
  Web3HTTPProviderAdapter,
} from "./web3-provider-adapter";

extendEnvironment((hre) => {
  hre.Web3 = lazyFunction(() => require("web3"));
  hre.web3 = lazyObject(() => {
    const Web3 = require("web3");
    if (hre.network.name === "hardhat") {
      return new Web3(
        new Web3HardhatNetworkProviderAdapter(hre.network.provider)
      );
    }
    return new Web3(new Web3HTTPProviderAdapter(hre.network.provider));
  });
});
