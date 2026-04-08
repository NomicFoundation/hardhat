import type { EthersIgnitionHelper } from "./types.js";

export type * from "@nomicfoundation/hardhat-ignition";
export type * from "@nomicfoundation/hardhat-ethers";

declare module "hardhat/types/network" {
  interface NetworkConnection<
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the ChainTypeT must be declared in the interface but in this scenario it's not used
    ChainTypeT extends ChainType | string = DefaultChainType,
  > {
    ignition: EthersIgnitionHelper;
  }
}
