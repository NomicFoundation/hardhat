import type { HardhatUserConfig } from "hardhat/types";

import "@nomicfoundation/hardhat-toolbox-viem";
import "@nomicfoundation/hardhat-ignition-viem";

const config: HardhatUserConfig = {
  solidity: "0.8.19",
};

export default config;
