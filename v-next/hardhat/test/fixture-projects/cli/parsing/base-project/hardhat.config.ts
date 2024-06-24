import type { HardhatUserConfig } from "@nomicfoundation/hardhat-core/config";

import { task } from "@nomicfoundation/hardhat-core/config";

export const tasksResults = {
  wasParam1Used: false,
};

const customTask = task("task")
  .setDescription("A task that uses param1")
  .setAction(() => {
    tasksResults.wasParam1Used = true;
  })
  .build();

export default {
  tasks: [customTask],
} satisfies HardhatUserConfig;
