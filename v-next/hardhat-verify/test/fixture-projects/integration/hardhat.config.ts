import type { HardhatUserConfig } from "hardhat/config";

import hardhatVerify from "../../../src/index.js";

const config: HardhatUserConfig = {
  networks: {
    default: {
      type: "edr",
      chainId: 11155111, // Sepolia
    },
  },
  solidity: {
    profiles: {
      default: {
        version: "0.8.28",
      },
      production: {
        version: "0.8.28",
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
