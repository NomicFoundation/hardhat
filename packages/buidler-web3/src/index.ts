import { extendEnvironment } from "@nomiclabs/buidler/config";
import { lazyFunction, lazyObject } from "@nomiclabs/buidler/plugins";

import { Web3HTTPProviderAdapter } from "./web3-provider-adapter";

declare module "@nomiclabs/buidler/types" {
  interface BuidlerRuntimeEnvironment {
    Web3: any;
    web3: any;
  }
}

extendEnvironment(env => {
  env.Web3 = lazyFunction(() => require("web3"));
  env.web3 = lazyObject(() => {
    // This function is designed to import and initialize web3 in a lazy fashion.
    // It has to remove web3 from global, as some web3 files access global.web3,
    // which will trigger this again recrusively and fail.
    const globalAsAny = global as any;
    const hasGlobalWeb3 = typeof globalAsAny.web3 !== "undefined";
    globalAsAny.web3 = undefined;

    const Web3 = require("web3");
    const web3 = new Web3(new Web3HTTPProviderAdapter(env.provider));

    if (hasGlobalWeb3) {
      globalAsAny.web3 = web3;
    }

    return web3;
  });
});
