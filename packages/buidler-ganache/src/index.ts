import { TASK_TEST } from "@nomiclabs/buidler/builtin-tasks/task-names";
import { task } from "@nomiclabs/buidler/config";
import { ensurePluginLoadedWithUsePlugin } from "@nomiclabs/buidler/plugins";
import { HttpNetworkConfig } from "@nomiclabs/buidler/types";

import { GanacheWrapper } from "./ganache-wrapper";

ensurePluginLoadedWithUsePlugin();

function isDevelopNetwork(network: string) {
  return network === "develop";
}

export default function() {
  task(TASK_TEST, async (_, env, runSuper) => {
    console.log("Selected network is", env.buidlerArguments.network);

    // This type assertion is only needed for now.
    const network = env.config.networks[
      env.buidlerArguments.network
    ] as HttpNetworkConfig;

    const ganache = new GanacheWrapper(network.url);
    const ganacheIsRunning = await ganache.isRunning();

    if (!isDevelopNetwork(env.buidlerArguments.network) || ganacheIsRunning) {
      return runSuper();
    }

    ganache.start();

    const ret = await runSuper();

    ganache.stop();

    return ret;
  });
}
