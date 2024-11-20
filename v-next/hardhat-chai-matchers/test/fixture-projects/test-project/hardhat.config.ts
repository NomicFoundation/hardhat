import type { HardhatUserConfig } from "@ignored/hardhat-vnext/config";

import HardhatMochaPlugin from "@ignored/hardhat-vnext-mocha-test-runner";

import hardhatChaiMatchersPlugin from "../../../src/index.js";

const config: HardhatUserConfig = {
  plugins: [HardhatMochaPlugin, hardhatChaiMatchersPlugin],
};

export default config;
