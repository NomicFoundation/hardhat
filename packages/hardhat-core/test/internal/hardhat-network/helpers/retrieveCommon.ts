/* eslint-disable dot-notation,@typescript-eslint/dot-notation */
import { Common } from "@nomicfoundation/ethereumjs-common";
import { isEdrProvider } from "./isEdrProvider";

export async function retrieveCommon(provider: any): Promise<Common> {
  if (isEdrProvider(provider)) {
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
