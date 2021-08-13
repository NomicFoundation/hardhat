import "hardhat/types/runtime";
import { HardhatWaffle } from "./types";

declare module "hardhat/types/runtime" {
  interface HardhatRuntimeEnvironment {
    waffle: HardhatWaffle;
  }
}
