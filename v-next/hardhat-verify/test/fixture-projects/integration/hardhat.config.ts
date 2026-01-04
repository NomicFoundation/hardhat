import type { HardhatUserConfig } from "hardhat/config";

import hardhatVerify from "../../../src/index.js";

const config: HardhatUserConfig = {
  networks: {
    default: {
      type: "edr-simulated",
      chainId: 11155111, // Sepolia
    },
  },
  solidity: {
    profiles: {
      default: {
        compilers: [
          {
            version: "0.8.28",
          },
          {
            version: "0.8.33",
          },
        ],
      },
      production: {
        compilers: [
          {
            version: "0.8.28",
          },
          {
            version: "0.8.33",
          },
        ],
      },
    },
  },
  plugins: [hardhatVerify],
  verify: {
    etherscan: {
      apiKey: "someApiKey",
    },
  },
};

export default config;
