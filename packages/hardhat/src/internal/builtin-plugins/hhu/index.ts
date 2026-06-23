import type { HardhatPlugin } from "../../../types/plugins.js";

import { definePlugin } from "../../../plugins.js";

import { generateTasks } from "./tasks/index.js";

const hardhatPlugin: HardhatPlugin = definePlugin({
  id: "builtin:hhu",
  tasks: generateTasks({ prefixWithUtils: true }),
  npmPackage: "hardhat",
});

export default hardhatPlugin;
