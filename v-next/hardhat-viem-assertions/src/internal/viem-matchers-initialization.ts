import type { HardhatViemHelpers } from "@nomicfoundation/hardhat-viem/types";
import type { ChainType } from "hardhat/types/network";

import { HardhatViemAssertionsImpl } from "./viem-matchers.js";

export async function initializeViemAssertions<
  ChainTypeT extends ChainType | string = "generic",
>(
  viem: HardhatViemHelpers<ChainTypeT>,
): Promise<HardhatViemAssertionsImpl<ChainTypeT>> {
  return new HardhatViemAssertionsImpl(viem);
}
