import type { HardhatUserConfig } from "@ignored/hardhat-vnext/config";

import HardhatMochaPlugin from "../../../src/index.js";

const config: HardhatUserConfig = {
  plugins: [HardhatMochaPlugin],
  mocha: {
    // @ts-expect-error -- testing config validation
    delay: 123,
  },
};

export default config;
