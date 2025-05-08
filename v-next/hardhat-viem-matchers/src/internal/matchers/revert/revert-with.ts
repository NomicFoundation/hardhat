import type { ReadContractReturnType, WriteContractReturnType } from "viem";

import assert from "node:assert/strict";

import { handleRevert } from "./core-revert.js";

export async function revertWith(
  contractFn: Promise<ReadContractReturnType | WriteContractReturnType>,
  expectedReason: string,
): Promise<void> {
  const reason = await handleRevert(contractFn);

  assert.equal(
    reason,
    expectedReason,
    `The function was expected to revert with reason "${expectedReason}", but it reverted with reason "${reason}".`,
  );
}
