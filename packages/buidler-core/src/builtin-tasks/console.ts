import fsExtra from "fs-extra";
import * as path from "path";
import * as semver from "semver";

import { task } from "../internal/core/config/config-env";
import { runScriptWithBuidler } from "../internal/util/scripts-runner";

import { TASK_CONSOLE } from "./task-names";

export default function() {
  task(TASK_CONSOLE, "Opens a buidler console")
    .addFlag("noCompile", "Don't compile before running this task")
    .setAction(
      async ({ noCompile }: { noCompile: boolean }, { config, run }) => {
        if (!noCompile) {
          await run("compile");
        }

        await fsExtra.ensureDir(config.paths.cache);
        const historyFile = path.join(
          config.paths.cache,
          "console-history.txt"
        );

        const nodeArgs = [];
        if (semver.gte(process.version, "10.0.0")) {
          nodeArgs.push("--experimental-repl-await");
        }

        // Running the script "" is like running `node`, so this starts the repl
        await runScriptWithBuidler("", [], nodeArgs, {
          NODE_REPL_HISTORY: historyFile
        });
      }
    );
}
