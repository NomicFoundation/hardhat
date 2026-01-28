import type { HardhatUserConfig } from "hardhat/types/config";

import hardhatExposedExample from "../../../src/index.js";

const config: HardhatUserConfig = {
  plugins: [hardhatExposedExample],
  solidity: "0.8.23",
};

export default config;
