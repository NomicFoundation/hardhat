import { ViemIgnitionHelper } from "./viem-ignition-helper.js";

declare module "hardhat/types/runtime" {
  export interface HardhatRuntimeEnvironment {
    ignition: ViemIgnitionHelper;
  }
}
