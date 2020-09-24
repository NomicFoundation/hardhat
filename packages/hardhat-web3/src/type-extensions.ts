import "hardhat/types/runtime";

declare module "hardhat/types/runtime" {
  interface HardhatRuntimeEnvironment {
    Web3: any;
    web3: any;
  }
}
