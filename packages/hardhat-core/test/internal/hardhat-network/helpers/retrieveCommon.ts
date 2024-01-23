/* eslint-disable dot-notation,@typescript-eslint/dot-notation */
import { Common } from "@nomicfoundation/ethereumjs-common";

import { HardhatNetworkProvider } from "../../../../src/internal/hardhat-network/provider/provider";

export async function retrieveCommon(
  provider: HardhatNetworkProvider
): Promise<Common> {
  if (provider["_node"] === undefined) {
    await provider["_init"]();
  }
  const common = provider["_node"]?.["_vm"].common;
  if (common === undefined) {
    throw new Error("Failed to retrieve common from HardhatNetworkProvider");
  }
  return common;
}
