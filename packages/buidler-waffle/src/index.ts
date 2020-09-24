import { extendEnvironment, usePlugin } from "@nomiclabs/buidler/config";
import { lazyObject } from "@nomiclabs/buidler/plugins";

import { buidlerDeployContract, getDeployMockContract } from "./deploy";
import { getLinkFunction } from "./link";
import { initializeWaffleMatchers } from "./matchers";
import "./type-extensions";

export default function () {
  extendEnvironment((hre) => {
    // We can't actually implement a MockProvider because of its private
    // properties, so we cast it here 😢
    hre.waffle = lazyObject(() => {
      const {
        WaffleMockProviderAdapter,
      } = require("./waffle-provider-adapter");

      const { buidlerCreateFixtureLoader } = require("./fixtures");

      const buidlerWaffleProvider = new WaffleMockProviderAdapter(
        hre.network
      ) as any;

      return {
        provider: buidlerWaffleProvider,
        deployContract: buidlerDeployContract.bind(undefined, hre),
        deployMockContract: getDeployMockContract(),
        solidity: require("./waffle-chai"),
        createFixtureLoader: buidlerCreateFixtureLoader.bind(
          undefined,
          buidlerWaffleProvider
        ),
        loadFixture: buidlerCreateFixtureLoader(buidlerWaffleProvider),
        link: getLinkFunction(),
      };
    });

    initializeWaffleMatchers(hre.config.paths.root);
  });

  usePlugin("@nomiclabs/buidler-ethers");
}
