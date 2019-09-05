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

    // Get all default values and set to resolved config map
    const defaultOptions = GanacheService.getDefaultOptions();

    // Override ganache network with custom config values (if needed)
    if (config.networks && config.networks.ganache) {
      // Case A: There is some custom config for ganache network (use merged options)
      const options = config.networks.ganache;

      // Transform Buidler network url to hostname and port
      const url = options.url.replace("http://", "");
      const urlArray = url.split(":");
      if (urlArray.length === 2) {
        options.hostname = urlArray[0];
        options.port = urlArray[1];
      } else {
        options.url = `http://${defaultOptions.hostname}:${defaultOptions.port}`;
      }

      // Merge default options with config ones (with config priority)
      resolvedConfig.networks.ganache = { ...defaultOptions, ...options };
    } else {
      // Case B: There is NO custom config for ganache network (use defaults options)
      resolvedConfig.networks.ganache = defaultOptions;

      // Add Buidler URL parameter
      resolvedConfig.networks.ganache.url = `http://${defaultOptions.hostname}:${defaultOptions.port}`;
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

  try {
    // Init ganache service with resolved options
    const options = env.network.config;
    const ganacheService = lazyObject(() => new GanacheService(options));

    // Start ganache server and log errors
    await ganacheService.startServer();

    // Run normal TEST or RUN task
    ret = await runSuper();

    // Stop ganache server and log errors
    await ganacheService.stopServer();
  } catch (e) {
    throw new BuidlerPluginError(e.message);
  }

  return ret;
}
