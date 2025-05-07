import type { ReadContractReturnType, WriteContractReturnType } from "viem";

import { handleRevert } from "./core.js";

export async function revert(
  promise: Promise<ReadContractReturnType | WriteContractReturnType>,
): Promise<void> {
  await handleRevert(promise);
}
