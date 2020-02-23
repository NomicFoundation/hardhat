import { extendEnvironment, usePlugin } from "@nomiclabs/buidler/config";
import { lazyObject } from "@nomiclabs/buidler/plugins";

function initializeWaffleMatchers() {
  const wafflePath = require.resolve("ethereum-waffle");
  const waffleChaiPath = require.resolve("@ethereum-waffle/chai", {
    paths: [wafflePath]
  });
  const { waffleChai } = require(waffleChaiPath);

  try {
    const chai = require("chai");
    chai.use(waffleChai);
  } catch (error) {
    // If chai isn't installed we just don't initialize the matchers
  }
}

export default function() {
  initializeWaffleMatchers();

  extendEnvironment(bre => {
    // We can't actually implement a MockProvider because of its private
    // properties, so we cast it here 😢
    bre.waffle = lazyObject(() => {
      const {
        WaffleMockProviderAdapter
      } = require("./waffle-provider-adapter");

      return {
        provider: new WaffleMockProviderAdapter(bre.network) as any
      };
    });
  });

  usePlugin("@nomiclabs/buidler-ethers");
}
