import type { HardhatUserConfig } from "hardhat/config";

import hardhatViem from "@nomicfoundation/hardhat-viem";
import hardhatViemAssertions from "../../../src/index.js";

const config: HardhatUserConfig = {
  plugins: [hardhatViem, hardhatViemAssertions],
  solidity: {
    version: "0.8.33",
    settings: {
      evmVersion: "osaka",
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },
};

export default config;
