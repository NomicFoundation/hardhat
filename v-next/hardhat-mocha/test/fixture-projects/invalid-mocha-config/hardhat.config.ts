import type { HardhatUserConfig } from "hardhat/config";

import HardhatMochaPlugin from "../../../src/index.js";

const config: HardhatUserConfig = {
  plugins: [HardhatMochaPlugin],
  test: {
    mocha: {
      // @ts-expect-error -- testing config validation
      delay: 123,
    },
  },
};

export default config;
