import type { HardhatUserConfig } from "../../../../../src/types/config.js";

import { task } from "../../../../../src/internal/core/config.js";

export const tasksResults = {
  wasArg1Used: false,
};

const customTask = task("user-task")
  .setAction({
    action: async () => ({
      default: () => {
        tasksResults.wasArg1Used = true;
      },
    }),
  })
  .build();

const config: HardhatUserConfig = {
  tasks: [customTask],
};

export default config;
