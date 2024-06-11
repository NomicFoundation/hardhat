import type { HardhatUserConfig } from "@nomicfoundation/hardhat-core/config";

import { task } from "@nomicfoundation/hardhat-core/config";

export const results = [false];

const customTask = task("user-task")
  .setAction(() => {
    results[0] = true;
  })
  .build();

export default {
  tasks: [customTask],
} satisfies HardhatUserConfig;
