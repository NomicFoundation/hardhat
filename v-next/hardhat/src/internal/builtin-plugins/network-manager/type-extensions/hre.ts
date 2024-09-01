import type { NetworkManager } from "../types.js";

import "../../../../types/hre.js";
declare module "../../../../types/hre.js" {
  export interface HardhatRuntimeEnvironment {
    network: NetworkManager;
  }
}
