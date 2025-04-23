import type { HardhatUserConfig } from "hardhat/config";

// eslint-disable-next-line import/no-relative-packages -- allow in fixture projects
import HardhatViem from "../../../src/index.js";

const config: HardhatUserConfig = {
  plugins: [HardhatViem],
  solidity: {
    profiles: {
      default: {
        version: "0.8.0",
      },
    },
  },
};

export default config;
