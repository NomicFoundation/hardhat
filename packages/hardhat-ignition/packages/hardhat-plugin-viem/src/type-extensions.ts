import { ViemIgnitionHelper } from "./viem-ignition-helper";

declare module "hardhat/types/runtime" {
  export interface HardhatRuntimeEnvironment {
    ignition: ViemIgnitionHelper;
  }
}
