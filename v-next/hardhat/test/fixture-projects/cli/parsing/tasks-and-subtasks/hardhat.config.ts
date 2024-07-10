import type { HardhatUserConfig } from "@ignored/hardhat-vnext-core/config";

import { task } from "@ignored/hardhat-vnext-core/config";

export const tasksResults = {
  wasArg1Used: false,
  wasArg2Used: false,
  wasArg3Used: false,
};

function resetResults() {
  tasksResults.wasArg1Used = false;
  tasksResults.wasArg2Used = false;
  tasksResults.wasArg3Used = false;
}

const customTask = task("task")
  .addOption({ name: "arg1", defaultValue: "<default-value1>" })
  .addPositionalArgument({ name: "arg2" })
  .addVariadicArgument({ name: "arg3" })
  .setAction((taskArguments) => {
    resetResults();

    const { arg1, arg2, arg3 } = taskArguments;

    tasksResults.wasArg1Used = arg1 === "<value1>";
    tasksResults.wasArg2Used = arg2 === "<value2>";
    // Variadic arguments are always in an array
    if (Array.isArray(arg3)) {
      tasksResults.wasArg3Used = arg3[0] === "<value3>";
    }
  })
  .build();

const customTask2 = task("task-default")
  .addOption({ name: "arg1", defaultValue: "<default-value1>" })
  .setAction((taskArguments) => {
    resetResults();

    const { arg1 } = taskArguments;
    tasksResults.wasArg1Used = arg1 === "<default-value1>";
  })
  .build();

const customSubtask = task(["task", "subtask"])
  .addOption({ name: "arg1", defaultValue: "<default-value1>" })
  .addPositionalArgument({ name: "arg2" })
  .addVariadicArgument({ name: "arg3" })
  .setAction((taskArguments) => {
    resetResults();

    const { arg1, arg2, arg3 } = taskArguments;

    tasksResults.wasArg1Used = arg1 === "<value1>";
    tasksResults.wasArg2Used = arg2 === "<value2>";
    // Variadic arguments are always in an array
    if (Array.isArray(arg3)) {
      tasksResults.wasArg3Used = arg3[0] === "<value3>";
    }
  })
  .build();

const customSubtask2 = task(["task-default", "subtask-default"])
  .addOption({ name: "arg1", defaultValue: "<default-value1>" })
  .setAction((taskArguments) => {
    resetResults();

    const { arg1 } = taskArguments;
    tasksResults.wasArg1Used = arg1 === "<default-value1>";
  })
  .build();

const config: HardhatUserConfig = {
  tasks: [customTask, customTask2, customSubtask, customSubtask2],
};

export default config;
