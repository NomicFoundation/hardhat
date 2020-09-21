/* tslint:disable:no-string-literal */
import Common from "ethereumjs-common";

import { BuidlerEVMProvider } from "../../../../src/internal/buidler-evm/provider/provider";

export async function retrieveCommon(
  provider: BuidlerEVMProvider
): Promise<Common> {
  if (provider["_node"] === undefined) {
    await provider["_init"]();
  }
  const common = provider["_node"]?.["_vm"]._common;
  if (common === undefined) {
    throw new Error("Failed to retrieve common from BuidlerEVMProvider");
  }
  return common;
}
