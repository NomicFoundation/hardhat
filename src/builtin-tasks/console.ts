import { ActionType, TaskArguments } from "../types";
import { ITaskDefinition } from "../core/tasks/TaskDefinition";

declare function task<ArgsT extends TaskArguments>(
  name: string,
  descriptionOrAction?: string | ActionType<ArgsT>,
  action?: ActionType<ArgsT>
): ITaskDefinition;

task("console", "Opens a buidler console")
  .addFlag("noCompile", "Don't compile before running this task")
  .setAction(async ({ noCompile }: { noCompile: boolean }, { config, run }) => {
    const path = await import("path");
    const fsExtra = await import("fs-extra");
    const repl = await import("repl");
    const replHistory = await import("repl.history");

    if (!noCompile) {
      await run("compile");
    }

    await fsExtra.ensureDir(config.paths.cache);
    const historyFile = path.join(config.paths.cache, "console_history");

    const theRepl = repl.start({ useGlobal: true, ignoreUndefined: true });

    replHistory(theRepl, historyFile);
  });
