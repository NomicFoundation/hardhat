import type { ReadContractReturnType, WriteContractReturnType } from "viem";

import { handleRevert } from "./core-revert.js";

export async function revert(
  contractFn: Promise<ReadContractReturnType | WriteContractReturnType>,
): Promise<void> {
  await handleRevert(contractFn);
}
