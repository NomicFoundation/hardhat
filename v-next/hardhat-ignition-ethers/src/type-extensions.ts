import type { EthersIgnitionHelper } from "./types.js";

import "@ignored/hardhat-vnext-ignition";

declare module "@ignored/hardhat-vnext/types/network" {
  interface NetworkConnection<
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the ChainTypeT must be declared in the interface but in this scenario it's not used
    ChainTypeT extends ChainType | string = DefaultChainType,
  > {
    ignition: EthersIgnitionHelper;
  }
}
