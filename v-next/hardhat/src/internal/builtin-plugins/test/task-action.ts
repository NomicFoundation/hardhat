import type { NewTaskActionFunction } from "../../../types/tasks.js";

import chalk from "chalk";

import { formatTaskId } from "../../core/tasks/utils.js";

interface TestActionArguments {
  noCompile: boolean;
}

const runScriptWithHardhat: NewTaskActionFunction<TestActionArguments> = async (
  { noCompile },
  hre,
) => {
  const thisTask = hre.tasks.getTask("test");

  if (!noCompile) {
    await hre.tasks.getTask("compile").run({ quiet: true });
  }

  for (const subtask of thisTask.subtasks.values()) {
    console.log(
      chalk.bold(`Running the subtask "${formatTaskId(subtask.id)}"`),
    );
    await subtask.run({ noCompile: true });
    console.log();
  }

  if (process.exitCode !== 0) {
    console.error("Test run failed");
  }
};

export default runScriptWithHardhat;
