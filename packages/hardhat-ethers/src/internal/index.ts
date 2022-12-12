import type EthersT from "ethers";
import type * as ProviderProxyT from "./provider-proxy";

import { extendEnvironment } from "hardhat/config";
import { lazyObject } from "hardhat/plugins";

import {
  getContractAt,
  getContractAtFromArtifact,
  getContractFactory,
  getContractFactoryFromArtifact,
  getImpersonatedSigner,
  getSigner,
  getSigners,
  deployContract,
} from "./helpers";
import "./type-extensions";

const registerCustomInspection = (BigNumber: any) => {
  const inspectCustomSymbol = Symbol.for("nodejs.util.inspect.custom");

  BigNumber.prototype[inspectCustomSymbol] = function () {
    return `BigNumber { value: "${this.toString()}" }`;
  };
};

extendEnvironment((hre) => {
  hre.ethers = lazyObject(() => {
    const { createProviderProxy } =
      require("./provider-proxy") as typeof ProviderProxyT;

    const { ethers } = require("ethers") as typeof EthersT;

    registerCustomInspection(ethers.BigNumber);

    const providerProxy = createProviderProxy(hre.network.provider);

    return {
      ...ethers,

      provider: providerProxy,

      getSigner: (address: string) => getSigner(hre, address),
      getSigners: () => getSigners(hre),
      getImpersonatedSigner: (address: string) =>
        getImpersonatedSigner(hre, address),
      // We cast to any here as we hit a limitation of Function#bind and
      // overloads. See: https://github.com/microsoft/TypeScript/issues/28582
      getContractFactory: getContractFactory.bind(null, hre) as any,
      getContractFactoryFromArtifact: getContractFactoryFromArtifact.bind(
        null,
        hre
      ),
      getContractAt: getContractAt.bind(null, hre),
      getContractAtFromArtifact: getContractAtFromArtifact.bind(null, hre),
      deployContract: deployContract.bind(null, hre) as any,
    };
  });
});
