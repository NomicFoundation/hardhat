import type { TaskOverrideActionFunction } from "../../../types/tasks.js";

import {
  getTestProfile,
  resolveTestProfileName,
} from "./select-test-profile.js";

interface TestActionArguments {
  testProfile?: string;
}

/**
 * The `test` task forwards its arguments to the subtasks that declare them, so
 * this override only validates the selected profile. It does that here, rather
 * than leaving it to the Solidity subtask, because the umbrella task builds the
 * project before running any subtask: an unknown profile would otherwise be
 * reported after a full compilation.
 */
const validateTestProfile: TaskOverrideActionFunction<
  TestActionArguments
> = async (args, hre, runSuper) => {
  getTestProfile(hre.config, resolveTestProfileName(args.testProfile));

  return await runSuper(args);
};

export default validateTestProfile;
