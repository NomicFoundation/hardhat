import { extendEnvironment } from "@nomiclabs/buidler/config";
import { lazyFunction, lazyObject } from "@nomiclabs/buidler/plugins";

import { promisifyWeb3 } from "./pweb3";
import { Web3HTTPProviderAdapter } from "./web3-provider-adapter";

declare module "@nomiclabs/buidler/types" {
  export interface BuidlerRuntimeEnvironment {
    Web3: any;
    web3: any;
    pweb3: any;
  }
}

extendEnvironment(env => {
  env.Web3 = lazyFunction(() => require("web3"));
  env.web3 = lazyObject(
    () => new env.Web3(new Web3HTTPProviderAdapter(env.ethereum))
  );
  env.pweb3 = lazyObject(() => promisifyWeb3(env.web3));
});
