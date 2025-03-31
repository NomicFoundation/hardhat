import type { HardhatUserConfig } from "hardhat/types/config";

import {
  hardhatIgnitionViemPlugin,
  hardhatKeystorePlugin,
  hardhatNetworkHelpersPlugin,
  hardhatNodeTestRunnerPlugin,
  hardhatViemPlugin,
  // eslint-disable-next-line import/no-relative-packages -- allow in fixture projects
} from "../../../src/index.js";

const config: HardhatUserConfig = {
  solidity: "0.8.28",
  plugins: [
    hardhatIgnitionViemPlugin,
    hardhatKeystorePlugin,
    hardhatNetworkHelpersPlugin,
    hardhatNodeTestRunnerPlugin,
    hardhatViemPlugin,
  ],
};

export default config;
