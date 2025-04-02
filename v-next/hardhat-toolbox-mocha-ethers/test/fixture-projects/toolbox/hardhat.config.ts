import type { HardhatUserConfig } from "hardhat/types/config";

// eslint-disable-next-line import/no-relative-packages -- allow in fixture projects
import hardhatToolboxMochaEthersPlugin from "../../../src/index.js";

const config: HardhatUserConfig = {
  plugins: [hardhatToolboxMochaEthersPlugin],
};

export default config;
