import type { HardhatUserConfig } from "@ignored/hardhat-vnext-core/config";

import { task } from "@ignored/hardhat-vnext-core/config";

export const tasksResults = {
  wasParam1Used: false,
};

const customTask = task("user-task")
  .setAction(() => {
    tasksResults.wasParam1Used = true;
  })
  .build();

const config: HardhatUserConfig = {
  tasks: [customTask],
};

export default config;
