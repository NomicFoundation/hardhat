import type { HardhatPlugin } from "../../../types/plugins.js";
import "./type-extensions.js";

const hardhatPlugin: HardhatPlugin = {
  id: "artifacts",
  hookHandlers: {
    hre: import.meta.resolve("./hookHandlers/hre.js"),
  },
};

export default hardhatPlugin;
