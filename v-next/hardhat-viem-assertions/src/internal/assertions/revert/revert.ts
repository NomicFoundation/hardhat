import type { ReadContractReturnType, WriteContractReturnType } from "viem";

import { handleRevert } from "./handle-revert.js";

export async function revert(
  contractFn: Promise<ReadContractReturnType | WriteContractReturnType>,
): Promise<void> {
  await handleRevert(contractFn);
}
