import type { HardhatPlugin } from "../../../types/plugins.js";

import { definePlugin } from "../../../plugins.js";

export type * from "./type-extensions.js";

const hardhatPlugin: HardhatPlugin = definePlugin({
  id: "builtin:artifacts",
  hookHandlers: {
    hre: () => import("./hook-handlers/hre.js"),
  },
  npmPackage: "hardhat",
});

export default hardhatPlugin;
