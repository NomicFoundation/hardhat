const importLazy = require("import-lazy")(require);
const fs = importLazy("fs-extra");

const { BuidlerError, ERRORS } = require("../core/errors");

task("run", "Runs an user-defined script after compiling the project")
  .addPositionalParam(
    "script",
    "A js file to be run within buidler's environment"
  )
  .addFlag("noCompile", "Don't compile before running this task")
  .setAction(async ({ script, noCompile }) => {
    if (!(await fs.exists(script))) {
      throw new BuidlerError(ERRORS.TASK_RUN_FILE_NOT_FOUND, script);
    }

    if (!noCompile) {
      await run("compile");
    }

    try {
      require(await fs.realpath(script));
    } catch (error) {
      throw new BuidlerError(
        ERRORS.TASK_RUN_SCRIPT_ERROR,
        error,
        script,
        error.message
      );
    }
  });
