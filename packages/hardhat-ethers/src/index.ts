import type EthersT from "ethers";
import { extendEnvironment } from "hardhat/config";
import { lazyObject } from "hardhat/plugins";

import { getContractAt, getContractFactory, getSigners } from "./helpers";
import "./type-extensions";

extendEnvironment((hre) => {
  hre.ethers = lazyObject(() => {
    const { EthersProviderWrapper } = require("./ethers-provider-wrapper");

    const { ethers } = require("ethers") as typeof EthersT;

    return {
      ...ethers,

      // The provider wrapper should be removed once this is released
      // https://github.com/nomiclabs/hardhat/pull/608
      provider: new EthersProviderWrapper(hre.network.provider),

      getSigners: async () => getSigners(hre),
      // We cast to any here as we hit a limitation of Function#bind and
      // overloads. See: https://github.com/microsoft/TypeScript/issues/28582
      getContractFactory: getContractFactory.bind(null, hre) as any,
      getContractAt: getContractAt.bind(null, hre),
    };
  });
});
