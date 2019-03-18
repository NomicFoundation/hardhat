import { extendEnvironment } from "@nomiclabs/buidler/config";
import { lazyObject } from "@nomiclabs/buidler/plugins";
import {task} from "@nomiclabs/buidler/internal/core/config/config-env"

export class EtherscanBuidlerEnvironment {
    constructor(
        public readonly url: string = 'https://api.etherscan.io/api',
        public readonly token : string = ''
    ) {
    }
}

declare module "@nomiclabs/buidler/types" {
  export interface BuidlerRuntimeEnvironment {
    etherscan: EtherscanBuidlerEnvironment;
  }

  export interface ResolvedBuidlerConfig {
    etherscan: {
      url?:string;
      token?: string
    }
  }
}

task('verify', "Verifies contract on etherscan", async (taskArgs, env) => {
  console.log({etherscan: env.etherscan})
});

extendEnvironment(env => {
  env.etherscan = lazyObject(
      () => new EtherscanBuidlerEnvironment(
          env.config.etherscan.url,
          env.config.etherscan.token
      )
  );
});
