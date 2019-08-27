import {
  TASK_RUN,
  TASK_TEST
} from "@nomiclabs/buidler/builtin-tasks/task-names";
import { task } from "@nomiclabs/buidler/config";
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
  if (env.network.name === "ganache") {
    console.log(">> Buidler Ganache > NO Handling Task");
    return runSuper();
  }

  console.log(">> Buidler Ganache > Handling Task");

  // Init ganache service with current configs
  const ganacheService = lazyObject(() => new GanacheService(args, env));

  // Start ganache server and log errors
  ganacheService.startServer();

  // Run normal TEST TASK
  const ret = await runSuper();

  // Stop ganache server
  ganacheService.stopServer();

  return ret;
}
