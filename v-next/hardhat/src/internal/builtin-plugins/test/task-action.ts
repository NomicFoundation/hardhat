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
    await hre.tasks.getTask("compile").run({});
    console.log();
  }

  for (const subtask of thisTask.subtasks.values()) {
    if (subtask.options.has("noCompile")) {
      await subtask.run({ noCompile: true });
    } else {
      await subtask.run({});
    }
  }

  if (process.exitCode !== undefined && process.exitCode !== 0) {
    console.error("Test run failed");
  }
};

export default runAllTests;
