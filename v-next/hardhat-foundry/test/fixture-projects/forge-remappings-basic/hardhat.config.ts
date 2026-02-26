import type { HardhatUserConfig } from "hardhat/config";

import hardhatFoundry from "../../../src/index.js";

const config: HardhatUserConfig = {
  plugins: [hardhatFoundry],
  solidity: "0.8.23",
};

export default config;
