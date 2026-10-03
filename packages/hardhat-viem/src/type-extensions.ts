import type { HardhatViemHelpers } from "./types.js";
import type { Chain as ViemChain } from "viem";

declare module "hardhat/types/config" {
  interface ChainDescriptorUserConfig {
    viemChain?: ViemChain;
  }

  interface ChainDescriptorConfig {
    viemChain?: ViemChain;
  }
}

declare module "hardhat/types/network" {
  interface NetworkConnection<
    ChainTypeT extends ChainType | string = DefaultChainType,
  > {
    viem: HardhatViemHelpers<ChainTypeT>;
  }
}
