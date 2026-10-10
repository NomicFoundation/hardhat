import type { HardhatUserConfig } from "hardhat/config";

import HardhatSlangPlugin from "../../../src/index.js";

const config: HardhatUserConfig = {
  solidity: {
    profiles: {
      default: {
        version: "0.8.34",
      },
      slang: {
        type: "slang",
        version: "0.8.34",
      },
    },
  },
  slang: {
    version: "0.1.0-pre.2026-10-01",
  },
  plugins: [HardhatSlangPlugin],
};

export default config;
