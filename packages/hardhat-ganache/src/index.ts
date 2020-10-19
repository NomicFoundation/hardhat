import debug from "debug";
import { TASK_RUN, TASK_TEST } from "hardhat/builtin-tasks/task-names";
import { extendConfig, task } from "hardhat/config";
import {
  HardhatRuntimeEnvironment,
  RunSuperFunction,
  TaskArguments,
} from "hardhat/types";

const log = debug("hardhat:plugin:ganache");

import { GanacheService } from "./ganache-service";

task(TASK_TEST, async (_args, env, runSuper) => {
  return handlePluginTask(env, runSuper);
});

task(TASK_RUN, async (_args, env, runSuper) => {
  return handlePluginTask(env, runSuper);
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

async function handlePluginTask(
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
