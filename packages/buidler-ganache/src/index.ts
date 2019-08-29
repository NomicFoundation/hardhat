import {
  TASK_RUN,
  TASK_TEST
} from "@nomiclabs/buidler/builtin-tasks/task-names";
import { BuidlerConfig, extendConfig, task } from "@nomiclabs/buidler/config";
import {
  ensurePluginLoadedWithUsePlugin,
  lazyObject
} from "@nomiclabs/buidler/plugins";
import {
  BuidlerRuntimeEnvironment,
  RunSuperFunction,
  TaskArguments
} from "@nomiclabs/buidler/src/types";

import { GanacheService } from "./ganache-service";

ensurePluginLoadedWithUsePlugin();

export default function() {
  // Original parameters: resolvedConfig: ResolvedBuidlerConfig, config: DeepReadonly<BuidlerConfig>)
  extendConfig((resolvedConfig: any, config: any) => {
    // TODO Extract all this to a GanacheService function
    // Set ganache as default network if no value was given
    if (!config.defaultNetwork) {
      resolvedConfig.defaultNetwork = "ganache";
    }

    // Get all default values
    resolvedConfig.networks.ganache = { url: "http://127.0.0.1:8545" };

    // Override ganache network with custom user values if needed
    if (config.networks && config.networks.ganache) {
      if (config.networks.ganache.host) {
        resolvedConfig.networks.ganache.url = `${config.networks.ganache.host}:8545`;
      }

      if (config.networks.ganache.port) {
        resolvedConfig.networks.ganache.url = `http://127.0.0.1:${config.networks.ganache.port}`;
      }
    }
  });

  task(TASK_TEST, async (args, env, runSuper) => {
    return handlePluginTask(args, env, runSuper);
  });

  task(TASK_RUN, async (args, env, runSuper) => {
    return handlePluginTask(args, env, runSuper);
  });
}

async function handlePluginTask(
  args: string,
  env: BuidlerRuntimeEnvironment,
  runSuper: RunSuperFunction<TaskArguments>
) {
  if (env.network.name !== "ganache") {
    console.log(">> Buidler Ganache > No handling Task\n");
    return runSuper();
  }

  console.log(">> Buidler Ganache > Handling Task");

  // Init ganache service with current configs
  const ganacheService = lazyObject(() => new GanacheService(env));

  // Start ganache server and log errors
  ganacheService.startServer();

  // Run normal TEST TASK
  const ret = await runSuper();

  // Stop ganache server
  ganacheService.stopServer();

  return ret;
}
