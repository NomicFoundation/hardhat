import type Web3 from "web3";

import "hardhat/types/runtime";

declare module "hardhat/types/runtime" {
  interface HardhatRuntimeEnvironment {
    Web3: typeof Web3;
    web3: Web3;
  }
}
