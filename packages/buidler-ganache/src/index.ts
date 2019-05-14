import { TASK_TEST } from "@nomiclabs/buidler/builtin-tasks/task-names";
import { task } from "@nomiclabs/buidler/config";
import { ensurePluginLoadedWithUsePlugin } from "@nomiclabs/buidler/plugins";
import { HttpNetworkConfig } from "@nomiclabs/buidler/types";

ensurePluginLoadedWithUsePlugin();

export default function() {
  task(TASK_TEST, async (_, env, runSuper) => {
    console.log("Selected network is", env.buidlerArguments.network);

    // This type assertion is only needed for now.
    const network = env.config.networks[
      env.buidlerArguments.network
    ] as HttpNetworkConfig;

    console.log("Selected network's URL", network.url);

    // Init ganache if necessary

    const ret = await runSuper();

    // Stop ganache if necessary

    return ret;
  });
}
