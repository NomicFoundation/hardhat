import type { HardhatUserConfig } from "@ignored/hardhat-vnext-core/config";

import { task } from "@ignored/hardhat-vnext-core/config";

export const tasksResults = {
  wasParam1Used: false,
  wasParam2Used: false,
  wasParam3Used: false,
};

function resetResults() {
  tasksResults.wasParam1Used = false;
  tasksResults.wasParam2Used = false;
  tasksResults.wasParam3Used = false;
}

const customTask = task("task")
  .addOption({ name: "param1" })
  .addPositionalParameter({ name: "param2" })
  .addVariadicParameter({ name: "param3" })
  .setAction((taskArguments) => {
    resetResults();

    const { param1, param2, param3 } = taskArguments;

    tasksResults.wasParam1Used = param1 === "<value1>";
    tasksResults.wasParam2Used = param2 === "<value2>";
    if (Array.isArray(param3)) {
      tasksResults.wasParam3Used = param3[0] === "<value3>"; // Variadic parameters are always in an array
    }
  })
  .build();

const customTask2 = task("task-default")
  .addOption({ name: "param1", defaultValue: "<default-value1>" })
  .setAction((taskArguments) => {
    resetResults();

    const { param1 } = taskArguments;
    tasksResults.wasParam1Used = param1 === "<default-value1>";
  })
  .build();

const customSubtask = task(["task", "subtask"])
  .addOption({ name: "param1" })
  .addPositionalParameter({ name: "param2" })
  .addVariadicParameter({ name: "param3" })
  .setAction((taskArguments) => {
    resetResults();

    const { param1, param2, param3 } = taskArguments;

    tasksResults.wasParam1Used = param1 === "<value1>";
    tasksResults.wasParam2Used = param2 === "<value2>";
    if (Array.isArray(param3)) {
      tasksResults.wasParam3Used = param3[0] === "<value3>"; // Variadic parameters are always in an array
    }
  })
  .build();

const customSubtask2 = task(["task-default", "subtask-default"])
  .addOption({ name: "param1", defaultValue: "<default-value1>" })
  .setAction((taskArguments) => {
    resetResults();

    const { param1 } = taskArguments;
    tasksResults.wasParam1Used = param1 === "<default-value1>";
  })
  .build();

export default {
  tasks: [customTask, customTask2, customSubtask, customSubtask2],
} satisfies HardhatUserConfig;
