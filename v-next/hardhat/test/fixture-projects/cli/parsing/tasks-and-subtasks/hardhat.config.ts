import type { HardhatUserConfig} from "@nomicfoundation/hardhat-core/config";

import { task } from "@nomicfoundation/hardhat-core/config";

export const results = [false, false, false];

function resetResults() {
  results[0] = false;
  results[1] = false;
  results[2] = false;
}

const customTask = task("task")
  .addNamedParameter({ name: "param1" })
  .addPositionalParameter({ name: "param2" })
  .addVariadicParameter({ name: "param3" })
  .setAction((taskArguments) => {
    resetResults();

    const { param1, param2, param3 } = taskArguments;

    results[0] = param1 === "<value1>";
    results[1] = param2 === "<value2>";
    if (Array.isArray(param3)) {
      results[2] = param3[0] === "<value3>";
    }
  })
  .build();

const customTask2 = task("task-default")
  .addNamedParameter({ name: "param1", defaultValue: "<default-value1>" })
  .setAction((taskArguments) => {
    resetResults();

    const { param1 } = taskArguments;
    results[0] = param1 === "<default-value1>";
  })
  .build();

const customSubtask = task(["task", "subtask"])
  .addNamedParameter({ name: "param1" })
  .addPositionalParameter({ name: "param2" })
  .addVariadicParameter({ name: "param3" })
  .setAction((taskArguments) => {
    resetResults();

    const { param1, param2, param3 } = taskArguments;

    results[0] = param1 === "<value1>";
    results[1] = param2 === "<value2>";
    if (Array.isArray(param3)) {
      results[2] = param3[0] === "<value3>";
    }
  })
  .build();

const customSubtask2 = task(["task-default", "subtask-default"])
  .addNamedParameter({ name: "param1", defaultValue: "<default-value1>" })
  .setAction((taskArguments) => {
    resetResults();

    const { param1 } = taskArguments;
    results[0] = param1 === "<default-value1>";
  })
  .build();

export default {
  tasks: [customTask, customTask2, customSubtask, customSubtask2],
} satisfies HardhatUserConfig;
