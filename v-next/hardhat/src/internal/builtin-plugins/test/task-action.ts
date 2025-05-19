import type { NewTaskActionFunction } from "../../../types/tasks.js";

import { unsafelyCastAsHardhatRuntimeEnvironmentImplementation } from "../coverage/helpers.js";

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

  if (hre.globalOptions.coverage === true) {
    const hreImplementation =
      unsafelyCastAsHardhatRuntimeEnvironmentImplementation(hre);
    hreImplementation._coverage.disableReport();
  }

  for (const subtask of thisTask.subtasks.values()) {
    if (subtask.options.has("noCompile")) {
      await subtask.run({ noCompile: true });
    } else {
      await subtask.run({});
    }
  }

  if (hre.globalOptions.coverage === true) {
    const hreImplementation =
      unsafelyCastAsHardhatRuntimeEnvironmentImplementation(hre);
    const ids = Array.from(thisTask.subtasks.keys());
    hreImplementation._coverage.enableReport();
    await hreImplementation._coverage.report(...ids);
    console.log();
  }

  if (process.exitCode !== undefined && process.exitCode !== 0) {
    console.error("Test run failed");
  }
};

export default runAllTests;
