import "@nomicfoundation/hardhat-viem";
import type { HardhatViemAssertions } from "./types.js";

declare module "@nomicfoundation/hardhat-viem/types" {
	interface HardhatViemHelpers {
		/**
		 * Ethereum-specific assertions integrated with viem. Accessible via `viem.assertions`.
		 */
		assertions: HardhatViemAssertions;
	}
}
