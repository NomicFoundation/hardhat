const importLazy = require("import-lazy")(require);
const fs = importLazy("fs-extra");

task("run", "Runs an user-defined script after compiling the project")
  .addPositionalParam(
    "script",
    "A js file to be run within buidler's environment"
  )
  .addFlag("noCompile", "Don't compile before running this task")
  .setAction(async ({ script, noCompile }) => {
    if (!(await fs.exists(script))) {
      throw new Error(`Script ${script} doesn't exist.`);
    }

    if (!noCompile) {
      await run("compile");
    }

    require(await fs.realpath(script));
  });
