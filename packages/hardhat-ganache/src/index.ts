import debug from "debug";
import { TASKS } from "hardhat/builtin-tasks/task-names";
import { extendConfig, task } from "hardhat/config";
import { ensurePluginLoadedWithUsePlugin } from "hardhat/plugins";
import {
  HardhatRuntimeEnvironment,
  RunSuperFunction,
  TaskArguments,
} from "hardhat/types";

const log = debug("hardhat:plugin:ganache");

import { GanacheService } from "./ganache-service";

ensurePluginLoadedWithUsePlugin();

export default function () {
  task(TASKS.TEST.MAIN, async (args, env, runSuper) => {
    return handlePluginTask(args, env, runSuper);
  });

  task(TASKS.RUN.MAIN, async (args, env, runSuper) => {
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
  env: HardhatRuntimeEnvironment,
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
