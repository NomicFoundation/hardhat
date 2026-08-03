import type { HardhatUserConfig } from "hardhat/config";

import HardhatMochaPlugin from "../../../src/index.js";

const config: HardhatUserConfig = {
  plugins: [HardhatMochaPlugin],
  test: {
    mocha: {
      parallel: true,
    },
  },
};

export default config;
