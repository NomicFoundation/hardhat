import type { HardhatUserConfig } from "../../../../src/config.js";

import { task } from "../../../../src/config.js";
import { errorResult, successResult } from "../../../../src/utils/result.js";

const failingTask = task("failing-task")
  .setInlineAction(() => {
    return errorResult();
  })
  .build();

const succeedingTask = task("succeeding-task")
  .setInlineAction(() => {
    return successResult(42);
  })
  .build();

const undefinedTask = task("undefined-task")
  .setInlineAction(() => {})
  .build();

const plainObjectTask = task("plain-object-task")
  .setInlineAction(() => {
    return { failed: 2, passed: 5 };
  })
  .build();

const failingTaskWithValue = task("failing-task-with-value")
  .setInlineAction(() => {
    return errorResult({ failed: 2, passed: 5 });
  })
  .build();

const succeedingTaskNoValue = task("succeeding-task-no-value")
  .setInlineAction(() => {
    return successResult();
  })
  .build();

const config: HardhatUserConfig = {
  tasks: [
    failingTask,
    succeedingTask,
    undefinedTask,
    plainObjectTask,
    failingTaskWithValue,
    succeedingTaskNoValue,
  ],
};

export default config;
