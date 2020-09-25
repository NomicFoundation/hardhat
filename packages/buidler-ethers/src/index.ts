import EthersT from "ethers";
import { extendEnvironment } from "hardhat/config";
import { lazyObject } from "hardhat/plugins";
import { HardhatRuntimeEnvironment } from "hardhat/types";

import { getContractAt, getContractFactory, getSigners } from "./helpers";
import "./type-extensions";

export default function () {
  extendEnvironment((env: HardhatRuntimeEnvironment) => {
    env.ethers = lazyObject(() => {
      const { EthersProviderWrapper } = require("./ethers-provider-wrapper");

      const { ethers } = require("ethers") as typeof EthersT;

      return {
        ...ethers,

        // The provider wrapper should be removed once this is released
        // https://github.com/nomiclabs/hardhat/pull/608
        provider: new EthersProviderWrapper(env.network.provider),

        getSigners: async () => getSigners(env),
        // We cast to any here as we hit a limitation of Function#bind and
        // overloads. See: https://github.com/microsoft/TypeScript/issues/28582
        getContractFactory: getContractFactory.bind(null, env) as any,
        getContractAt: getContractAt.bind(null, env),
      };
    });
  });
}
