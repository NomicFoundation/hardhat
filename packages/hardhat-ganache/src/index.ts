import debug from "debug";
import { TASK_RUN, TASK_TEST } from "hardhat/src/builtin-tasks/task-names";
import { extendConfig, task } from "hardhat/src/config";
import {
  HardhatRuntimeEnvironment,
  RunSuperFunction,
  TaskArguments,
} from "hardhat/src/types";

const log = debug("hardhat:plugin:ganache");

import { GanacheService, HardhatGanacheOptions } from "./ganache-service";

task(TASK_TEST, async (_args, env, runSuper) => {
  return handlePluginTask(env, runSuper);
});

task(TASK_RUN, async (_args, env, runSuper) => {
  return handlePluginTask(env, runSuper);
});

extendConfig((resolvedConfig: any, config: any) => {
  const defaultOptions = GanacheService.getDefaultOptions();

  if (config.networks?.ganache !== undefined) {
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
  //console.log("env.network",env.network)
  const options = env.network.config as unknown as HardhatGanacheOptions;
  const ganacheService = await GanacheService.create(options);

  await ganacheService.startServer();

  const ret = await runSuper();

  log("Stopping Ganache");
  await ganacheService.stopServer();

  return ret;
}
