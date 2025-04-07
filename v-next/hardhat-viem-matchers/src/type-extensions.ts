import "hardhat/types/network";
import type { HardhatViemMatchers } from "./types.js";
import type { HardhatViemHelpers } from "@nomicfoundation/hardhat-viem/types";

declare module "hardhat/types/network" {
  interface NetworkConnection<
    ChainTypeT extends ChainType | string = DefaultChainType,
  > {
    viemMatchers: HardhatViemMatchers<ChainTypeT>;
    viem: HardhatViemHelpers<ChainTypeT> & {
      assertions: HardhatViemMatchers<ChainTypeT>;
    };
  }
}
