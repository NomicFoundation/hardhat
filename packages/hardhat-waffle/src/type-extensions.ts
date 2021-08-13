import "hardhat/types/runtime";
import { HardhatWaffle } from "./HardhatWaffle";

declare module "hardhat/types/runtime" {
  interface HardhatRuntimeEnvironment {
    waffle: HardhatWaffle;
  }
}
