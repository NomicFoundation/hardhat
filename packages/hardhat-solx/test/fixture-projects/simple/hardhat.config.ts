import type { HardhatUserConfig } from "hardhat/config";

import HardhatSolxPlugin from "../../../src/index.js";

const config: HardhatUserConfig = {
  solidity: {
    profiles: {
      default: {
        version: "0.8.33",
      },
      solx: {
        type: "solx",
        version: "0.8.33",
      },
    },
  },
  plugins: [HardhatSolxPlugin],
};

export default config;
