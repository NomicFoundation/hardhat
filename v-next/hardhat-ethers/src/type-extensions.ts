import "hardhat/types/network";
import type { HardhatEthers } from "./types.js";

declare module "hardhat/types/network" {
  interface NetworkConnection<
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the ChainTypeT must be declared in the interface but in this scenario it's not used
    ChainTypeT extends ChainType | string = DefaultChainType,
  > {
    ethers: HardhatEthers;
  }
}
