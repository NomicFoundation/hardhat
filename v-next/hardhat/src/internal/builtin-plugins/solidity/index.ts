import type { HardhatPlugin } from "../../../types/plugins.js";

import "./type-extensions.js";

const hardhatPlugin: HardhatPlugin = {
  id: "builtin:solidity",
  hookHandlers: {
    config: import.meta.resolve("./hook-handlers/config.js"),
  },
};

export default hardhatPlugin;
