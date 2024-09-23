import type { HardhatUserConfig } from "@ignored/hardhat-vnext/types/config";

import HardhatNodeTestRunner from "@ignored/hardhat-vnext-node-test-runner";

const config: HardhatUserConfig = {
  plugins: [HardhatNodeTestRunner],
};

export default config;
