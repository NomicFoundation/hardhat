import { extendEnvironment } from "buidler/config";
import Web3 from "web3";

import { promisifyWeb3 } from "./pweb3";
import { Web3HTTPProviderAdapter } from "./web3-provider-adapter";

declare module "buidler/types" {
  export interface BuidlerRuntimeEnvironment {
    Web3: any;
    web3: any;
    pweb3: any;
  }
}

extendEnvironment(env => {
  env.Web3 = Web3;
  env.web3 = new Web3(new Web3HTTPProviderAdapter(env.provider));
  env.pweb3 = promisifyWeb3(env.web3);
});
