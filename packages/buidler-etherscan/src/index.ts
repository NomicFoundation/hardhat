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


task('verify-contract', "Verifies contract on etherscan")
    .addParam('contract-name', 'Name of the deployed contract')
    .addParam('address', 'Deployed address of smart contract')
    .addParam('libraries', 'Stringified JSON object in format of {library1: "0x2956356cd2a2bf3202f771f50d3d14a367b48071"}')
    .addOptionalVariadicPositionalParam('constructor-arguments', 'arguments for contract constructor')
    .setAction(
        async (
            taskArgs,
            {config, run}) => {
            if(!config.etherscan.token || !config.etherscan.token.trim()) {
                throw new BuidlerPluginError('Please provide etherscan api token via buidler.config.js (etherscan.token)')
            }
            const flattenedSource = await run(TASK_FLATTEN_GET_FLATTENED_SOURCE);
            console.log({taskArgs})
        }
    );
