import { extendEnvironment } from "@nomiclabs/buidler/config";
import { lazyFunction, lazyObject } from "@nomiclabs/buidler/plugins";

import { Web3HTTPProviderAdapter } from "./web3-provider-adapter";

declare module "@nomiclabs/buidler/types" {
  interface BuidlerRuntimeEnvironment {
    Web3: any;
    web3: any;
  }
}

/**
 * This function requires web3 and returns it.
 *
 * This has to be used instead of just require because we create
 * a lazy instance of web3 that evetually gets injected into global.
 *
 * Web requiring web3, there's a module of the library that inspects
 * global.web3 to detect the givenProvider, which triggers the lazy
 * instances and web3 is loaded again, resulting in a recrusive require.
 */
function loadWeb3() {
  const globalAsAny = global as any;
  const previousWeb3 = globalAsAny.web3;
  globalAsAny.web3 = undefined;

  const Web3 = require("web3");

  globalAsAny.web3 = previousWeb3;

  return Web3;
}

extendEnvironment(env => {
  env.Web3 = lazyFunction(() => loadWeb3());
  env.web3 = lazyObject(() => {
    const Web3 = loadWeb3();
    return new Web3(new Web3HTTPProviderAdapter(env.provider));
  });
});
