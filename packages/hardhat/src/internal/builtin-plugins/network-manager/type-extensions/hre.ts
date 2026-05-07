import type { NetworkManager } from "../../../../types/network.js";

declare module "../../../../types/hre.js" {
  export interface HardhatRuntimeEnvironment {
    network: NetworkManager;
  }
}
