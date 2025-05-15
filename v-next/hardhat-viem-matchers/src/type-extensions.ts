import "@nomicfoundation/hardhat-viem";
import type { HardhatViemMatchers } from "./types.js";

declare module "@nomicfoundation/hardhat-viem/types" {
  interface HardhatViemHelpers {
    assertions: HardhatViemMatchers;
  }
}
