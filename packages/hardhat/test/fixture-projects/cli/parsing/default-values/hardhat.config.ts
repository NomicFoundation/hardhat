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
  })
  .addPositionalArgument({
    name: "pos1",
    description: "pos1 description",
  })
  .addPositionalArgument({
    name: "pos2",
    description: "pos2 description",
    defaultValue: "pos2 default value",
  })
  .addVariadicArgument({
    name: "var1",
    description: "var1 description",
    defaultValue: ["var1 default value 1", "var1 default value 2"],
  })
  .build();

const config: HardhatUserConfig = {
  tasks: [customTask],
};

export default config;
