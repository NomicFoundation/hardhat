import type { HardhatPlugin } from "../../../types/plugins.js";
export type * from "./type-extensions.js";

const hardhatPlugin: HardhatPlugin = {
  id: "builtin:artifacts",
  hookHandlers: {
    hre: () => import("./hook-handlers/hre.js"),
  },
  npmPackage: "hardhat",
};

export default hardhatPlugin;
