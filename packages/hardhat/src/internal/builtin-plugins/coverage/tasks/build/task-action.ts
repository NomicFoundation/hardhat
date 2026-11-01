import type {
  TaskArguments,
  TaskOverrideActionFunction,
} from "../../../../../types/tasks.js";

import { getCoverageManager } from "../../helpers/accessors.js";

const buildWithCoverage: TaskOverrideActionFunction<TaskArguments> = async (
  args,
  hre,
  runSuper,
) => {
  const result = await runSuper(args);

  // The coverage metadata is only collected while building, so record that a
  // build ran. Test runners call this task unless --no-compile is used.
  if (hre.globalOptions.coverage === true) {
    getCoverageManager(hre).markBuildRun();
  }

  return result;
};

export default buildWithCoverage;
