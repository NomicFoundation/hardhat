import type { HardhatUserConfig } from "../../../../../src/config.js";

import { task } from "../../../../../src/config.js";

const customTask = task("test-task", "description")
  .setAction(async () => ({
    default: () => {},
  }))
  .addOption({
    name: "opt",
    description: "opt description",
    defaultValue: "opt default value",
    hidden: true,
  })
  .build();

const config: HardhatUserConfig = {
  tasks: [customTask],
};

export default config;
