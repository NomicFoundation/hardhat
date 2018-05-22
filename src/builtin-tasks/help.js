const importLazy = require("import-lazy")(require);
const path = require("path");
const fs = importLazy("fs-extra");

const {
  BUIDLER_CLI_PARAM_DEFINITIONS
} = require("../core/params/buidler-params");
const { HelpPrinter } = require("../cli/HelpPrinter");
const { getTaskDefinitions } = require("../core/tasks/dsl");

task("help", "Prints this message")
  .addPositionalParam(
    "task",
    "An optional task to print more info about",
    undefined,
    undefined,
    true
  )
  .setAction(async ({ task }) => {
    const packageInfo = await fs.readJson(
      path.join(__dirname, "../../package.json")
    );

    const helpPrinter = new HelpPrinter(
      packageInfo.name,
      packageInfo.version,
      BUIDLER_CLI_PARAM_DEFINITIONS,
      getTaskDefinitions()
    );

    if (task !== undefined) {
      helpPrinter.printTaskHelp(task);
      return;
    }

    helpPrinter.printGlobalHelp();
  });
