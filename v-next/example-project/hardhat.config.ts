import { defineConfig } from "hardhat/config";

import util from "node:util";

import HardhatViem from "@nomicfoundation/hardhat-viem";
import hardhatEthersPlugin from "@nomicfoundation/hardhat-ethers";

util.inspect.defaultOptions.depth = null;

export default defineConfig({
  plugins: [hardhatEthersPlugin, HardhatViem],
  solidity: "0.8.33",
});
