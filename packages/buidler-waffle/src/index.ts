import { extendEnvironment, usePlugin } from "@nomiclabs/buidler/config";

import { WaffleMockProviderAdapter } from "./waffle-provider-adapter";

export default function() {
  extendEnvironment(bre => {
    // We can't actually implement a MockProvider because of its private
    // properties, so we cast it here 😢
    bre.waffle = {
      provider: new WaffleMockProviderAdapter(bre.network) as any
    };
  });

  usePlugin("@nomiclabs/buidler-ethers");
}
