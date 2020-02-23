import { extendEnvironment, usePlugin } from "@nomiclabs/buidler/config";
import { lazyObject } from "@nomiclabs/buidler/plugins";

export default function() {
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
