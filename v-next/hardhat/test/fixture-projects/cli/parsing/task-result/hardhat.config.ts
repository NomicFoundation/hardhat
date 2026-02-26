import type { HardhatUserConfig } from "../../../../../src/config.js";

import { task } from "../../../../../src/config.js";

const failingTask = task("failing-task")
  .setInlineAction(() => {
    return { success: false };
  })
  .build();

const succeedingTask = task("succeeding-task")
  .setInlineAction(() => {
    return { success: true, value: 42 };
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

const config: HardhatUserConfig = {
  tasks: [failingTask, succeedingTask, undefinedTask, plainObjectTask],
};

export default config;
