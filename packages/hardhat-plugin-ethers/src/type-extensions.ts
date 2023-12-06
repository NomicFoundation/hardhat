import { EthersIgnitionHelper } from "./ethers-ignition-helper";

declare module "hardhat/types/runtime" {
  export interface HardhatRuntimeEnvironment {
    ignition: EthersIgnitionHelper;
  }
}
