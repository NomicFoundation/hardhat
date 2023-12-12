/* eslint-disable dot-notation,@typescript-eslint/dot-notation */
import { Common } from "@nomicfoundation/ethereumjs-common";
import { EdrProviderWrapper } from "../../../../src/internal/hardhat-network/provider/provider";

export async function retrieveCommon(provider: any): Promise<Common> {
  if (provider instanceof EdrProviderWrapper) {
    return provider["_common"];
  }

  if (provider["_node"] === undefined) {
    await provider["_init"]();
  }
  const common = provider["_node"]?.["_common"];
  if (common === undefined) {
    throw new Error("Failed to retrieve common from HardhatNetworkProvider");
  }
  return common;
}
