const fs = require("fs-extra");

task("run", "Runs an user-defined script after compiling the project")
  .addPositionalParam("script", "A js file to be run within buidler's environment")
  .setAction(async ({ script }) => {
    if (!(await fs.exists(script))) {
      throw new Error(`Script ${script} doesn't exist.`);
    }

    await run("compile");
    require(await fs.realpath(script));
  });
