import { HelpPrinter } from "../internal/cli/HelpPrinter";
import { HARDHAT_EXECUTABLE_NAME, HARDHAT_NAME } from "../internal/constants";
import { task } from "../internal/core/config/config-env";
import { HardhatError } from "../internal/core/errors";
import { ERRORS } from "../internal/core/errors-list";
import { HARDHAT_PARAM_DEFINITIONS } from "../internal/core/params/hardhat-params";

import { TASK_HELP } from "./task-names";

task(TASK_HELP, "Prints this message")
  .addOptionalPositionalParam(
    "scopeOrTask",
    "An optional scope or task to print more info about"
  )
  .addOptionalPositionalParam(
    "task",
    "An optional task to print more info about"
  )
  .setAction(
    async (
      { scopeOrTask, task: taskName }: { scopeOrTask?: string; task?: string },
      { tasks, scopes, version }
    ) => {
      const helpPrinter = new HelpPrinter(
        HARDHAT_NAME,
        HARDHAT_EXECUTABLE_NAME,
        version,
        HARDHAT_PARAM_DEFINITIONS,
        tasks,
        scopes
      );

      if (scopeOrTask === undefined) {
        // print global help
        helpPrinter.printGlobalHelp();
        return;
      }

      if (tasks[scopeOrTask] !== undefined) {
        // first is a valid task
        helpPrinter.printTaskHelp(tasks[scopeOrTask]);
        return;
      }

      const scopeDefinition = scopes[scopeOrTask];

      if (scopeDefinition === undefined) {
        // first is not a task nor a scope
        throw new HardhatError(ERRORS.ARGUMENTS.UNRECOGNIZED_TASK, {
          task: scopeOrTask,
        });
      }

      if (taskName === undefined) {
        // print scope help
        helpPrinter.printScopeHelp(scopeDefinition);
        return;
      }

      const taskDefinition = scopeDefinition.tasks[taskName];

      if (taskDefinition === undefined) {
        throw new HardhatError(ERRORS.ARGUMENTS.UNRECOGNIZED_SCOPED_TASK, {
          scope: scopeOrTask,
          task: taskName,
        });
      }

      // print task help
      helpPrinter.printTaskHelp(taskDefinition);
    }
  );
