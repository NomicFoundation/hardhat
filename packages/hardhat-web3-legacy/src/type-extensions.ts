import "hardhat/types/runtime";

declare module "hardhat/types/runtime" {
  export interface HardhatRuntimeEnvironment {
    Web3: any;
    web3: any;
    pweb3: any;
  }
}
