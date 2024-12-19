import type { HardhatPlugin } from "../../../types/plugins.js";
import "./type-extensions.js";

const hardhatPlugin: HardhatPlugin = {
  id: "builtin:artifacts",
  hookHandlers: {
    hre: import.meta.resolve("./hook-handlers/hre.js"),
  },
  npmPackage: "@ignored/hardhat-vnext",
};

export default hardhatPlugin;
