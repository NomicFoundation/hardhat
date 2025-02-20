import type { HardhatUserConfig } from "@ignored/hardhat-vnext/config";

import HardhatMochaPlugin from "@ignored/hardhat-vnext-mocha";

// eslint-disable-next-line import/no-relative-packages -- allow in fixture projects
import hardhatChaiMatchersPlugin from "../../../src/index.js";

const config: HardhatUserConfig = {
  plugins: [HardhatMochaPlugin, hardhatChaiMatchersPlugin],
};

export default config;
