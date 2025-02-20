import type { HardhatUserConfig } from "@ignored/hardhat-vnext/config";

import HardhatMochaPlugin from "../../../src/index.js";

const config: HardhatUserConfig = {
  plugins: [HardhatMochaPlugin],
};

export default config;
