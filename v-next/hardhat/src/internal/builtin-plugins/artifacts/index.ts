import type { HardhatPlugin } from "../../../types/plugins.js";
import "./type-extensions.js";

const hardhatPlugin: HardhatPlugin = {
  id: "artifacts",
  hookHandlers: {
    hre: import.meta.resolve("./hook-handlers/hre.js"),
  },
};

export default hardhatPlugin;
