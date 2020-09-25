import "hardhat/types";

declare module "hardhat/types" {
  export interface HardhatRuntimeEnvironment {
    Web3: any;
    web3: any;
    pweb3: any;
  }
}
