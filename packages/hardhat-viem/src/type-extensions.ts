import type { HardhatViemHelpers } from "./types.js";

declare module "hardhat/types/network" {
  interface NetworkConnection<
    ChainTypeT extends ChainType | string = DefaultChainType,
  > {
    viem: HardhatViemHelpers<ChainTypeT>;
  }
}
