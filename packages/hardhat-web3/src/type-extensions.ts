import "hardhat/types";

declare module "hardhat/types" {
  interface HardhatRuntimeEnvironment {
    Web3: any;
    web3: any;
  }
}
