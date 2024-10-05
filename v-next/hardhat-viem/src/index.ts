import type { HardhatPlugin } from "@ignored/hardhat-vnext/types/plugins";

/* eslint-disable-next-line @typescript-eslint/no-unused-vars
-- TODO: if we remove this line, the types are not augmented
with the network types */
import { createHardhatRuntimeEnvironment } from "@ignored/hardhat-vnext/hre";

import "./type-extensions.js";

const hardhatPlugin: HardhatPlugin = {
  id: "hardhat-viem",
  hookHandlers: {
    network: import.meta.resolve("./hook-handlers/network.js"),
  },
};

export default hardhatPlugin;
