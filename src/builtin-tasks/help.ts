import { getPackageJson } from "../util/packageInfo";
import { BUIDLER_PARAM_DEFINITIONS } from "../core/params/buidler-params";
import { HelpPrinter } from "../cli/HelpPrinter";
import { getTaskDefinitions } from "../core/tasks/dsl";
import { task } from "../config-dsl";

task("help", "Prints this message")
  .addOptionalPositionalParam(
    "task",
    "An optional task to print more info about"
  )
  .setAction(async ({ task }: { task?: string }) => {
    const packageJson = await getPackageJson();

    const helpPrinter = new HelpPrinter(
      packageJson.name,
      packageJson.version,
      BUIDLER_PARAM_DEFINITIONS,
      getTaskDefinitions()
    );

    if (task !== undefined) {
      helpPrinter.printTaskHelp(task);
      return;
    }

    helpPrinter.printGlobalHelp();
  });
