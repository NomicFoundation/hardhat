import type { HardhatUserConfig } from "@ignored/hardhat-vnext/config";

// eslint-disable-next-line import/no-relative-packages -- allow in fixture projects
import hardhatTypechain from "../../../src/index.js";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
  },
  plugins: [hardhatTypechain],
};

export default config;
