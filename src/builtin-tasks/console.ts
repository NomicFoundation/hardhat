import { task } from "../internal/core/config/config-env";
import { runScript } from "../internal/util/scripts-runner";

import { TASK_CONSOLE } from "./task-names";

task(TASK_CONSOLE, "Opens a buidler console")
  .addFlag("noCompile", "Don't compile before running this task")
  .setAction(async ({ noCompile }: { noCompile: boolean }, { config, run }) => {
    const path = await import("path");
    const fsExtra = await import("fs-extra");
    const semver = await import("semver");

    if (!noCompile) {
      await run("compile");
    }

    await fsExtra.ensureDir(config.paths.cache);
    const historyFile = path.join(config.paths.cache, "console-history.txt");

    const nodeArgs = ["--require", __dirname + "/../register"];
    if (semver.gte(process.version, "10.0.0")) {
      nodeArgs.push("--experimental-repl-await");
    }

    // Running the script "" is like running `node`, so this starts the repl
    await runScript("", [], nodeArgs, {
      NODE_REPL_HISTORY: historyFile
    });
  });
