import type { HardhatUserConfig } from "@nomicfoundation/hardhat-core/config";

import { task } from "@nomicfoundation/hardhat-core/config";

export const tasksResults = [false];

const customTask = task("task")
  .setAction(() => {
    tasksResults[0] = true;
  })
  .build();

export default {
  tasks: [customTask],
} satisfies HardhatUserConfig;
