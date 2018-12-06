import { HelpPrinter } from "../cli/HelpPrinter";
import tasksDsl from "../core/importable-tasks-dsl";
import { BUIDLER_PARAM_DEFINITIONS } from "../core/params/buidler-params";
import { getPackageJson } from "../util/packageInfo";

tasksDsl
  .task("help", "Prints this message")
  .addOptionalPositionalParam(
    "task",
    "An optional task to print more info about"
  )
  .setAction(async ({ task }: { task?: string }, { tasks }) => {
    const packageJson = await getPackageJson();

    const helpPrinter = new HelpPrinter(
      packageJson.name,
      packageJson.version,
      BUIDLER_PARAM_DEFINITIONS,
      tasks
    );

    if (task !== undefined) {
      helpPrinter.printTaskHelp(task);
      return;
    }

    helpPrinter.printGlobalHelp();
  });
