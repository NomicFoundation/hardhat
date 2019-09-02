import {
  TASK_RUN,
  TASK_TEST
} from "@nomiclabs/buidler/builtin-tasks/task-names";
import { BuidlerConfig, extendConfig, task } from "@nomiclabs/buidler/config";
import {
  BuidlerPluginError,
  ensurePluginLoadedWithUsePlugin,
  lazyObject
} from "@nomiclabs/buidler/plugins";
import {
  BuidlerRuntimeEnvironment,
  RunSuperFunction,
  TaskArguments
} from "@nomiclabs/buidler/src/types";
import debug from "debug";

const log = debug("buidler:plugin:ganache");

import { GanacheService } from "./ganache-service";

ensurePluginLoadedWithUsePlugin();

export default function() {
  // Original parameters: resolvedConfig: ResolvedBuidlerConfig, config: DeepReadonly<BuidlerConfig>)
  extendConfig((resolvedConfig: any, config: any) => {
    // Set ganache as default network if no value was given
    if (!config.defaultNetwork) {
      resolvedConfig.defaultNetwork = "ganache";
    }

    // Get all default values and set to resolved config map
    const defaultOptions = GanacheService.getDefaultOptions();
    resolvedConfig.networks.ganache = defaultOptions;
    resolvedConfig.networks.ganache.url = `http://${defaultOptions.hostname}:${defaultOptions.port}`;

    // Override ganache network with custom user values if needed
    if (config.networks && config.networks.ganache) {
      if (config.networks.ganache.hostname && config.networks.ganache.port) {
        resolvedConfig.networks.ganache.url = `${config.networks.ganache.hostname}:${config.networks.ganache.port}`;
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
    log("Buidler Ganache > No handling Task\n");
    return runSuper();
  }

  log("Buidler Ganache > Handling Task");

  // Init ganache service with current configs
  const ganacheService = lazyObject(() => new GanacheService(env));

  try {
    // Start ganache server and log errors
    ganacheService.startServer();
  } catch (e) {
    const msg = "Buidler Ganache > Starting ganache error";
    console.log(e);
    throw new BuidlerPluginError(msg);
  }

  // Run normal TEST or RUN task
  const ret = await runSuper();

  // Stop ganache server
  try {
    ganacheService.stopServer();
  } catch (e) {
    const msg = "Buidler Ganache > Stopping ganache error";
    console.log(e);
    throw new BuidlerPluginError(msg);
  }

  return ret;
}
