import { extendEnvironment } from "@nomiclabs/buidler/config";
import { lazyObject, BuidlerPluginError } from "@nomiclabs/buidler/plugins";
import {task} from "@nomiclabs/buidler/internal/core/config/config-env"
import {TASK_FLATTEN_GET_FLATTENED_SOURCE} from "@nomiclabs/buidler/builtin-tasks/task-names"

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

extendEnvironment(env => {
  env.etherscan = lazyObject(
      () => new EtherscanBuidlerEnvironment(
          env.config.etherscan.url,
          env.config.etherscan.token
      )
  );
});


task('verify', "Verifies contract on etherscan", async (taskArgs, {config, run}) => {
    if(!config.etherscan.token || !config.etherscan.token.trim()) {
        throw new BuidlerPluginError('Please provide etherscan api token via buidler.config.js (etherscan.token)')
    }
    const flattenedSource = await run(TASK_FLATTEN_GET_FLATTENED_SOURCE);
});
