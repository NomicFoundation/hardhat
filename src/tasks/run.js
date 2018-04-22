const fs = require("fs-extra");

task(
  "run",
  "Runs an user-defined script after compiling the project",
  async scriptPath => {
    if (!(await fs.exists(scriptPath))) {
      throw new Error(`Script ${scriptPath} doesn't exist.`);
    }

    await run("compile");
    require(await fs.realpath(scriptPath));
  }
);
