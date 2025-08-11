import type { HardhatUserConfig } from "../../../../../src/config.js";

import { emptyTask, task } from "../../../../../src/config.js";

export const tasksResults = {
  wasArg1Used: false,
  wasArg2Used: false,
  wasArg3Used: false,
  wasArg4Used: false,
  wasArg5Used: false,
};

function resetResults() {
  tasksResults.wasArg1Used = false;
  tasksResults.wasArg2Used = false;
  tasksResults.wasArg3Used = false;
  tasksResults.wasArg4Used = false;
  tasksResults.wasArg5Used = false;
}

const customTask = task("task")
  .addOption({ name: "arg1", shortName: "o", defaultValue: "<default-value1>" })
  .addPositionalArgument({ name: "arg2" })
  .addVariadicArgument({ name: "arg3" })
  .addFlag({ name: "arg4", shortName: "f" })
  .addLevel({ name: "arg5", shortName: "l" })
  .setAction(async () => ({
    default: (taskArguments) => {
      resetResults();

      const { arg1, arg2, arg3, arg4, arg5 } = taskArguments;

      tasksResults.wasArg1Used = arg1 === "<value1>";
      tasksResults.wasArg2Used = arg2 === "<value2>";
      // Variadic arguments are always in an array
      if (Array.isArray(arg3)) {
        tasksResults.wasArg3Used = arg3[0] === "<value3>";
      }
      tasksResults.wasArg4Used = arg4 !== false;
      tasksResults.wasArg5Used = arg5 !== 0;
    },
  }))
  .build();

const customTask2 = task("task-default")
  .addOption({ name: "arg1", shortName: "o", defaultValue: "<default-value1>" })
  .setAction(async () => ({
    default: (taskArguments) => {
      resetResults();

      const { arg1 } = taskArguments;
      tasksResults.wasArg1Used = arg1 === "<default-value1>";
    },
  }))
  .build();

const customTask3 = emptyTask("task-default-3", "description").build();

const customSubtask = task(["task", "subtask"])
  .addOption({ name: "arg1", shortName: "o", defaultValue: "<default-value1>" })
  .addPositionalArgument({ name: "arg2" })
  .addVariadicArgument({ name: "arg3" })
  .addFlag({ name: "arg4", shortName: "f" })
  .addLevel({ name: "arg5", shortName: "l" })
  .setAction(async () => ({
    default: (taskArguments) => {
      resetResults();

      const { arg1, arg2, arg3 } = taskArguments;

      tasksResults.wasArg1Used = arg1 === "<value1>";
      tasksResults.wasArg2Used = arg2 === "<value2>";
      // Variadic arguments are always in an array
      if (Array.isArray(arg3)) {
        tasksResults.wasArg3Used = arg3[0] === "<value3>";
      }
    },
  }))
  .build();

const customSubtask2 = task(["task-default", "subtask-default"])
  .addOption({ name: "arg1", shortName: "o", defaultValue: "<default-value1>" })
  .setAction(async () => ({
    default: (taskArguments) => {
      resetResults();

      const { arg1 } = taskArguments;
      tasksResults.wasArg1Used = arg1 === "<default-value1>";
    },
  }))
  .build();
const customSubtask3 = task(["task-default-3", "subtask-default-3"])
  .setAction(async () => ({ default: () => {} }))
  .build();

const config: HardhatUserConfig = {
  tasks: [
    customTask,
    customTask2,
    customTask3,
    customSubtask,
    customSubtask2,
    customSubtask3,
  ],
};

export default config;
