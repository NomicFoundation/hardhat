import type { NewTaskActionFunction } from "../../../types/tasks.js";

interface TestActionArguments {
  noCompile: boolean;
}

const runAllTests: NewTaskActionFunction<TestActionArguments> = async (
  { noCompile },
  hre,
) => {
  const thisTask = hre.tasks.getTask("test");

  if (!noCompile) {
    await hre.tasks.getTask("compile").run({ quiet: true });
  }

  for (const subtask of thisTask.subtasks.values()) {
    await subtask.run({ noCompile: true });
    console.log();
  }

  if (process.exitCode !== undefined && process.exitCode !== 0) {
    console.error("Test run failed");
  }
};

export default runAllTests;
