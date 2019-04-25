import { TASK_COMPILE_GET_SOURCE_PATHS } from "@nomiclabs/buidler/builtin-tasks/task-names";
import { internalTask } from "@nomiclabs/buidler/config";

import { getAutoexternalConfig } from "./config";
import { generateTestableContracts } from "./contracts";

internalTask(TASK_COMPILE_GET_SOURCE_PATHS, async (_, { config }, runSuper) => {
  const filePaths: string[] = await runSuper();

  const autoexternalConfig = getAutoexternalConfig(config);
  const testableContractPaths = await generateTestableContracts(
    config.paths,
    autoexternalConfig,
    filePaths
  );

  return [...filePaths, ...testableContractPaths];
});
