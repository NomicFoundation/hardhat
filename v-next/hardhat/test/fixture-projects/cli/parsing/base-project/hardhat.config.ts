import type { HardhatUserConfig } from "@ignored/hardhat-vnext-core/config";

import { task } from "@ignored/hardhat-vnext-core/config";

export const tasksResults = {
  wasArg1Used: false,
};

const customTask = task("task")
  .setDescription("A task that uses arg1")
  .setAction(() => {
    tasksResults.wasArg1Used = true;
  })
  .build();

const config: HardhatUserConfig = {
  tasks: [customTask],
};

export default config;
