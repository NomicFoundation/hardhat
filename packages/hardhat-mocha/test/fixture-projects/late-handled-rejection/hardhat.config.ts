import type { HardhatUserConfig } from "hardhat/config";

import HardhatMochaPlugin from "../../../src/index.js";

const config: HardhatUserConfig = {
  plugins: [HardhatMochaPlugin],
};

export default config;
