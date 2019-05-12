import fsExtra from "fs-extra";

import { task } from "../internal/core/config/config-env";
import { BuidlerError, ERRORS } from "../internal/core/errors";
import { runScriptWithBuidler } from "../internal/util/scripts-runner";

import { TASK_COMPILE, TASK_RUN } from "./task-names";

export default function() {
  task(TASK_RUN, "Runs a user-defined script after compiling the project")
    .addPositionalParam(
      "script",
      "A js file to be run within buidler's environment"
    )
    .addFlag("noCompile", "Don't compile before running this task")
    .setAction(
      async (
        { script, noCompile }: { script: string; noCompile: boolean },
        { run }
      ) => {
        if (!(await fsExtra.pathExists(script))) {
          throw new BuidlerError(
            ERRORS.BUILTIN_TASKS.RUN_FILE_NOT_FOUND,
            script
          );
        }

        if (!noCompile) {
          await run(TASK_COMPILE);
        }

        try {
          const statusCode = await runScriptWithBuidler(script);
          process.exit(statusCode);
        } catch (error) {
          throw new BuidlerError(
            ERRORS.BUILTIN_TASKS.RUN_SCRIPT_ERROR,
            error,
            script,
            error.message
          );
        }
      }
    );
}
