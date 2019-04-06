import { TASK_COMPILE_GET_SOURCE_PATHS } from "@nomiclabs/buidler/builtin-tasks/task-names";
import { internalTask } from "@nomiclabs/buidler/config";

import { getAutoexternConfig } from "./config";
import { generateTestableContracts } from "./contracts";

internalTask(TASK_COMPILE_GET_SOURCE_PATHS, async (_, { config }, runSuper) => {
  const filePaths: string[] = await runSuper();

  const autoexternConfig = getAutoexternConfig(config);
  const testableContractPaths = await generateTestableContracts(
    config.paths,
    autoexternConfig,
    filePaths
  );

  return [...filePaths, ...testableContractPaths];
});
