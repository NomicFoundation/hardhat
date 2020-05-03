import { extendEnvironment, usePlugin } from "@nomiclabs/buidler/config";
import { lazyObject } from "@nomiclabs/buidler/plugins";
import path from "path";

function initializeWaffleMatchers(projectRoot: string) {
  const wafflePath = require.resolve("ethereum-waffle");
  const waffleChaiPath = require.resolve("@ethereum-waffle/chai", {
    paths: [wafflePath],
  });
  const { waffleChai } = require(waffleChaiPath);

  try {
    let chaiPath = require.resolve("chai");

    // When using this plugin linked from sources, we'd end up with the chai
    // used to test it, not the project's version of chai, so we correct it.
    if (chaiPath.startsWith(path.join(__dirname, "..", "node_modules"))) {
      chaiPath = require.resolve("chai", {
        paths: [projectRoot],
      });
    }

    const chai = require(chaiPath);

    chai.use(waffleChai);
  } catch (error) {
    // If chai isn't installed we just don't initialize the matchers
  }
}

export default function () {
  extendEnvironment((bre) => {
    // We can't actually implement a MockProvider because of its private
    // properties, so we cast it here 😢
    bre.waffle = lazyObject(() => {
      const {
        WaffleMockProviderAdapter,
      } = require("./waffle-provider-adapter");

      return {
        provider: new WaffleMockProviderAdapter(bre.network) as any,
      };
    });

    initializeWaffleMatchers(bre.config.paths.root);
  });

  usePlugin("@nomiclabs/buidler-ethers");
}
