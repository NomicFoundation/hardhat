import type { HardhatUserConfig } from "../../../../../src/config.js";

import { task } from "../../../../../src/config.js";

export const tasksResults = {
  wasArg1Used: false,
};

const customTask = task("task")
  .setDescription("A task that uses arg1")
  .addOption({ name: "arg1", shortName: "o", defaultValue: "<default-value1>" })
  .addPositionalArgument({ name: "arg2" })
  .addVariadicArgument({ name: "arg3" })
  .addFlag({ name: "arg4", shortName: "f" })
  .setAction(() => {
    tasksResults.wasArg1Used = true;
  })
  .build();

const config: HardhatUserConfig = {
  tasks: [customTask],
};

export default config;
