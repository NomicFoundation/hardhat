import type { HardhatUserConfig } from "hardhat/config";

import hardhatEthersPlugin from "@nomicfoundation/hardhat-ethers";
import hardhatNetworkHelpersPlugin from "@nomicfoundation/hardhat-network-helpers";

import HardhatMochaPlugin from "../../../src/index.js";

const config: HardhatUserConfig = {
  plugins: [
    hardhatEthersPlugin,
    hardhatNetworkHelpersPlugin,
    HardhatMochaPlugin,
  ],
};

export default config;
