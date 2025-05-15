import type { HardhatViemHelpers } from "@nomicfoundation/hardhat-viem/types";
import type { ChainType } from "hardhat/types/network";

import { HardhatViemMatchersImpl } from "./viem-matchers.js";

export async function initializeViemMatchers<
  ChainTypeT extends ChainType | string = "generic",
>(
  viem: HardhatViemHelpers<ChainTypeT>,
): Promise<HardhatViemMatchersImpl<ChainTypeT>> {
  return new HardhatViemMatchersImpl(viem);
}
