import type { HardhatUserConfig } from "hardhat/config";

import hardhatEthersPlugin from "@nomicfoundation/hardhat-ethers";
import hardhatNetworkHelper from "@nomicfoundation/hardhat-network-helpers";

import HardhatMochaPlugin from "../../../src/index.js";

const config: HardhatUserConfig = {
  plugins: [HardhatMochaPlugin, hardhatEthersPlugin, hardhatNetworkHelper],
};

export default config;
