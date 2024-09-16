import "@ignored/hardhat-vnext/types/network";

import type { NetworkHelpers } from "./internal/network-helpers/network-helpers.js";
import type { ChainType } from "@ignored/hardhat-vnext/types/config";

declare module "@ignored/hardhat-vnext/types/network" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the ChainTypeT must be declared in the interface but in this scenario it's not used
  interface NetworkConnection<ChainTypeT extends ChainType | string> {
    networkHelpers: NetworkHelpers;
  }
}
