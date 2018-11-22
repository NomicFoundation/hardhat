import { getPackageJson } from "../util/packageInfo";
import { BUIDLER_PARAM_DEFINITIONS } from "../core/params/buidler-params";
import { HelpPrinter } from "../cli/HelpPrinter";
import { ActionType, TaskArguments } from "../types";
import { ITaskDefinition } from "../core/tasks/TaskDefinition";

declare function task<ArgsT extends TaskArguments>(
  name: string,
  descriptionOrAction?: string | ActionType<ArgsT>,
  action?: ActionType<ArgsT>
): ITaskDefinition;

task("help", "Prints this message")
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
