import "@ignored/hardhat-vnext/types/network";
import type { HardhatEthers } from "./types.js";

declare module "@ignored/hardhat-vnext/types/network" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the ChainTypeT must be declared in the interface but in this scenario it's not used
  interface NetworkConnection<ChainTypeT extends ChainType | string> {
    ethers: HardhatEthers;
  }
}
