import type { HardhatUserConfig } from "hardhat/types/config";

// eslint-disable-next-line import/no-relative-packages -- allow in fixture projects
import hardhatToolboxMochaEthersPlugin from "../../../src/index.js";

const config: HardhatUserConfig = {
  solidity: "0.8.28",
  plugins: [hardhatToolboxMochaEthersPlugin],
};

export default config;
