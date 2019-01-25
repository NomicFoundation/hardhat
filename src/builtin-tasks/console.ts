import { task } from "../internal/core/config/config-env";
import { runScript } from "../internal/util/scripts-runner";

task("console", "Opens a buidler console")
  .addFlag("noCompile", "Don't compile before running this task")
  .setAction(async ({ noCompile }: { noCompile: boolean }, { config, run }) => {
    const path = await import("path");
    const fsExtra = await import("fs-extra");

    if (!noCompile) {
      await run("compile");
    }

    await fsExtra.ensureDir(config.paths.cache);
    const historyFile = path.join(config.paths.cache, "console-history.txt");

    // Running the script "" is like running `node`, so this starts the repl
    await runScript("", [], ["--require", __dirname + "/../register"], {
      NODE_REPL_HISTORY: historyFile
    });
  });
