import { extendEnvironment } from "@nomiclabs/buidler/config";
import { lazyFunction, lazyObject } from "@nomiclabs/buidler/plugins";

import { Web3HTTPProviderAdapter } from "./web3-provider-adapter";

export default function() {
  extendEnvironment(env => {
    env.Web3 = lazyFunction(() => require("web3"));
    env.web3 = lazyObject(
      () => new env.Web3(new Web3HTTPProviderAdapter(env.network.provider))
    );
  });
}
