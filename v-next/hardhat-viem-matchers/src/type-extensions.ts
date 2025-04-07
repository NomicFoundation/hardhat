import "hardhat/types/network";
import type { HardhatViemMatchers } from "./types.js";

declare module "hardhat/types/network" {
  interface NetworkConnection<
    ChainTypeT extends ChainType | string = DefaultChainType,
  > {
    viemMatchers: HardhatViemMatchers<ChainTypeT>;
  }
}
