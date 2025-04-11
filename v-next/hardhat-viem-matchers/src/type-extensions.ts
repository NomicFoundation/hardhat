import "hardhat/types/network";
import type { HardhatViemMatchers, HardhatViemMatchers2 } from "./types.js";
import type { HardhatViemHelpers } from "@nomicfoundation/hardhat-viem/types";

declare module "hardhat/types/network" {
  interface NetworkConnection<
    ChainTypeT extends ChainType | string = DefaultChainType,
  > {
    viemMatchers: HardhatViemMatchers;
    viem: HardhatViemHelpers<ChainTypeT> & {
      assertions: HardhatViemMatchers;

      // This is the alternative not using `expect`:
      assertions2: HardhatViemMatchers2;
    };
  }
}
