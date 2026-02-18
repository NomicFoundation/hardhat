import type { HardhatUserConfig } from "hardhat/config";

import hardhatEthersPlugin from "@nomicfoundation/hardhat-ethers";
import HardhatMochaPlugin from "@nomicfoundation/hardhat-mocha";
import hardhatNetworkHelper from "@nomicfoundation/hardhat-network-helpers";

import hardhatChaiMatchersPlugin from "../../../src/index.js";

const config: HardhatUserConfig = {
  plugins: [
    hardhatEthersPlugin,
    HardhatMochaPlugin,
    hardhatNetworkHelper,
    hardhatChaiMatchersPlugin,
  ],
};

export default config;
