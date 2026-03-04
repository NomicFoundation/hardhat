import type { HardhatUserConfig } from "hardhat/config";

import HardhatSolxPlugin from "../../../src/index.js";

const config: HardhatUserConfig = {
  solidity: {
    compilers: [{ version: "0.8.33", type: "solx" }],
  },
  plugins: [HardhatSolxPlugin],
};

export default config;
