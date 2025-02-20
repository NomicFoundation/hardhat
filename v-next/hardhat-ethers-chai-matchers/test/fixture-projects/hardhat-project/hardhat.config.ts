import type { HardhatUserConfig } from "hardhat/config";

import hardhatEthersPlugin from "@nomicfoundation/hardhat-ethers";

const config: HardhatUserConfig = {
  plugins: [hardhatEthersPlugin],
};

export default config;
