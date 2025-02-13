import type { HardhatViemHelpers } from "./types.js";

import "@ignored/hardhat-vnext/types/network";
declare module "@ignored/hardhat-vnext/types/network" {
  interface NetworkConnection<
    ChainTypeT extends ChainType | string = DefaultChainType,
  > {
    viem: HardhatViemHelpers<ChainTypeT>;
  }
}
