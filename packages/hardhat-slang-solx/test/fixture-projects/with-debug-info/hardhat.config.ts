import type { HardhatUserConfig } from "hardhat/config";

import HardhatSlangSolxPlugin from "../../../src/index.js";

const config: HardhatUserConfig = {
  solidity: {
    profiles: {
      default: {
        version: "0.8.34",
      },
      "slang-solx": {
        type: "slang-solx",
        version: "0.8.34",
      },
    },
  },
  plugins: [HardhatSlangSolxPlugin],
};

export default config;
