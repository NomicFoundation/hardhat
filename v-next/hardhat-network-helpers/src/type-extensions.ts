import "hardhat/types/network";
import type { NetworkHelpers } from "./types.js";

declare module "hardhat/types/network" {
  interface NetworkConnection<
    ChainTypeT extends ChainType | string = DefaultChainType,
  > {
    networkHelpers: NetworkHelpers<ChainTypeT>;
  }
}
