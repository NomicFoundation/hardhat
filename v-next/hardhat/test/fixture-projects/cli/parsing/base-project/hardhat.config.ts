import type { HardhatUserConfig } from "@nomicfoundation/hardhat-core/config";

import { task } from "@nomicfoundation/hardhat-core/config";

export const tasksResults = {
  wasParam1Used: false,
};

const customTask = task("task")
  .setAction(() => {
    tasksResults.wasParam1Used = true;
  })
  .build();

export default {
  tasks: [customTask],
} satisfies HardhatUserConfig;
