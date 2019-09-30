import {
  TASK_RUN,
  TASK_TEST
} from "@nomiclabs/buidler/builtin-tasks/task-names";
import { extendConfig, task } from "@nomiclabs/buidler/config";
import { ensurePluginLoadedWithUsePlugin } from "@nomiclabs/buidler/plugins";
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
    const defaultOptions = GanacheService.getDefaultOptions();

    if (config.networks && config.networks.ganache) {
      const customOptions = config.networks.ganache;
      resolvedConfig.networks.ganache = { ...defaultOptions, ...customOptions };
    } else {
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
    return runSuper();
  }

  log("Starting Ganache");

  const options = env.network.config;
  const ganacheService = await GanacheService.create(options);

  await ganacheService.startServer();

  const ret = await runSuper();

  log("Stopping Ganache");
  await ganacheService.stopServer();

  return ret;
}
