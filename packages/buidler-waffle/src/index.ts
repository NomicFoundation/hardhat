import { extendEnvironment, usePlugin } from "@nomiclabs/buidler/config";
import { lazyObject } from "@nomiclabs/buidler/plugins";

import { buidlerDeployContract, getDeployMockContract } from "./deploy";
import { getLinkFunction } from "./link";
import { initializeWaffleMatchers } from "./matchers";

export default function () {
  extendEnvironment((bre) => {
    // We can't actually implement a MockProvider because of its private
    // properties, so we cast it here 😢
    bre.waffle = lazyObject(() => {
      const {
        WaffleMockProviderAdapter,
      } = require("./waffle-provider-adapter");

      const { buidlerCreateFixtureLoader } = require("./fixtures");

      const buidlerWaffleProvider = new WaffleMockProviderAdapter(
        bre.network
      ) as any;

      return {
        provider: buidlerWaffleProvider,
        deployContract: buidlerDeployContract.bind(undefined, bre),
        deployMockContract: getDeployMockContract(),
        solidity: require("./waffle-chai"),
        createFixtureLoader: buidlerCreateFixtureLoader.bind(
          buidlerWaffleProvider
        ),
        loadFixture: buidlerCreateFixtureLoader(buidlerWaffleProvider),
        link: getLinkFunction(),
      };
    });

    initializeWaffleMatchers(bre.config.paths.root);
  });

  usePlugin("@nomiclabs/buidler-ethers");
}
