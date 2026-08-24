import type { HardhatUserConfig } from "hardhat/config";

import HardhatSlangSolxPlugin from "../../../src/index.js";

const config: HardhatUserConfig = {
  solidity: {
    profiles: {
      default: {
        version: "0.8.34",
      },
      "slang-solx": {
        type: "slangSolx",
        version: "0.8.34",
      },
    },
  },
  plugins: [HardhatSlangSolxPlugin],
};

export default config;
