import type { HardhatUserConfig } from "hardhat/config";

import HardhatSlangPlugin from "../../../src/index.js";
import { getLatestSlangVersion } from "../../../src/internal/utils/slang-release-version.js";

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
    version: getLatestSlangVersion(),
  },
  plugins: [HardhatSlangPlugin],
};

export default config;
