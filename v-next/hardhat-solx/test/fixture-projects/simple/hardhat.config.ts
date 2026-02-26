import type { HardhatUserConfig } from "hardhat/config";

import HardhatSolxPlugin from "../../../src/index.js";

const config: HardhatUserConfig = {
  solidity: {
    compilers: [{ version: "0.8.28", type: "solx" }],
  },
  plugins: [HardhatSolxPlugin],
  solx: {
    version: "0.1.3",
  },
};

export default config;
