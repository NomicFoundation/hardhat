import type { HardhatUserConfig } from "hardhat/config";

import HardhatNodeTestPlugin from "../../../src/index.js";

const config: HardhatUserConfig = {
  plugins: [HardhatNodeTestPlugin],
};

export default config;
