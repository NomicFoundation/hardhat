import type { HardhatUserConfig } from "hardhat/config";

import hardhatEthersPlugin from "@nomicfoundation/hardhat-ethers";

const config: HardhatUserConfig = {
  plugins: [hardhatEthersPlugin],
  solidity: "0.8.24",
};

export default config;
