import type { HardhatViemAssertions } from "./types.js";

export type * from "@nomicfoundation/hardhat-viem";

declare module "@nomicfoundation/hardhat-viem/types" {
  interface HardhatViemHelpers {
    /**
     * Ethereum-specific test assertions integrated with viem.
     */
    assertions: HardhatViemAssertions;
  }
}
