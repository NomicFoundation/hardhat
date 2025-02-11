import type { ViemIgnitionHelper } from "./viem-ignition-helper.js";

import "@ignored/hardhat-vnext/types/network";
declare module "@ignored/hardhat-vnext/types/network" {
  interface NetworkConnection {
    ignition: ViemIgnitionHelper;
  }
}
