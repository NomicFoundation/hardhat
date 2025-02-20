import type { HardhatUserConfig } from "hardhat/config";

import HardhatMochaPlugin from "@nomicfoundation/hardhat-mocha-test-runner";

// eslint-disable-next-line import/no-relative-packages -- allow in fixture projects
import hardhatChaiMatchersPlugin from "../../../src/index.js";

const config: HardhatUserConfig = {
  plugins: [HardhatMochaPlugin, hardhatChaiMatchersPlugin],
};

export default config;
