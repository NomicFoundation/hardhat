import { getPackageJson } from "../util/packageInfo";
import { task } from "../config-dsl";

const {
  BUIDLER_CLI_PARAM_DEFINITIONS
} = require("../core/params/buidler-params");
const { HelpPrinter } = require("../cli/HelpPrinter");
const { getTaskDefinitions } = require("../core/tasks/dsl");

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
      BUIDLER_CLI_PARAM_DEFINITIONS,
      getTaskDefinitions()
    );

    if (task !== undefined) {
      helpPrinter.printTaskHelp(task);
      return;
    }

    helpPrinter.printGlobalHelp();
  });
