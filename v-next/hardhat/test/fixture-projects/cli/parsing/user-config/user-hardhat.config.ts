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

export default {
  tasks: [customTask],
} satisfies HardhatUserConfig;
