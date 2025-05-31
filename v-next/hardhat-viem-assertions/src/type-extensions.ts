import "@nomicfoundation/hardhat-viem";
import type { HardhatViemAssertions } from "./types.js";

declare module "@nomicfoundation/hardhat-viem/types" {
  interface HardhatViemHelpers {
    assertions: HardhatViemAssertions;
  }
}
