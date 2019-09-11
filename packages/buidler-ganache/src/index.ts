import {
  TASK_RUN,
  TASK_TEST
} from "@nomiclabs/buidler/builtin-tasks/task-names";
import { extendConfig, task } from "@nomiclabs/buidler/config";
import {
  BuidlerPluginError,
  ensurePluginLoadedWithUsePlugin
} from "@nomiclabs/buidler/plugins";
import {
  BuidlerRuntimeEnvironment,
  RunSuperFunction,
  TaskArguments
} from "@nomiclabs/buidler/src/types";
import debug from "debug";

const log = debug("buidler:plugin:ganache");
log.color = "6";

import { GanacheService } from "./ganache-service";

ensurePluginLoadedWithUsePlugin();

export default function() {
  task(TASK_TEST, async (args, env, runSuper) => {
    return handlePluginTask(args, env, runSuper);
  });

  task(TASK_RUN, async (args, env, runSuper) => {
    return handlePluginTask(args, env, runSuper);
  });

  extendConfig((resolvedConfig: any, config: any) => {
    // Set ganache as default network if no value was given
    if (!config.defaultNetwork) {
      resolvedConfig.defaultNetwork = "ganache";
    }

    if (resolvedConfig.defaultNetwork !== "ganache") {
      log("No extending config (skip all)");
      return;
    }

    // Get all default values and set to resolved config map
    const defaultOptions = GanacheService.getDefaultOptions();

    // Override ganache network with custom config values (if needed)
    if (config.networks && config.networks.ganache) {
      // Case A: There is some custom config for ganache network (use merged options)
      const customOptions = config.networks.ganache;

      resolvedConfig.networks.ganache = GanacheService.getMergedOptions(
        defaultOptions,
        customOptions
      );
    } else {
      // Case B: There is NO custom config for ganache network (use defaults options)
      resolvedConfig.networks.ganache = defaultOptions;

    }
  });
}

async function handlePluginTask(
  args: string,
  env: BuidlerRuntimeEnvironment,
  runSuper: RunSuperFunction<TaskArguments>
) {
  if (env.network.name !== "ganache") {
    log("No handling Task (skip all)");
    return runSuper();
  }

  // Start Task handling
  log("Handling Task");
  let ret: any;
  let ganacheService: GanacheService;

  try {
    // Init ganache service with resolved options
    const options = env.network.config;
    ganacheService = await GanacheService.create(options);

    // Start ganache server and log errors
    await ganacheService.startServer();
  } catch (e) {
    throw new BuidlerPluginError(e);
  }

  // Run normal TEST or RUN task
  ret = await runSuper();

  try {
    // Stop ganache server and log errors
    await ganacheService.stopServer();
  } catch (e) {
    throw new BuidlerPluginError(e);
  }

  return ret;
}
