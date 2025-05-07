import type { ReadContractReturnType, WriteContractReturnType } from "viem";

import assert from "node:assert/strict";

import { handleRevert } from "./core.js";

export async function revertWith(
  promise: Promise<ReadContractReturnType | WriteContractReturnType>,
  expectedReason: string,
): Promise<void> {
  const reason = await handleRevert(promise);

  assert.equal(
    reason,
    expectedReason,
    `The function was expected to revert with reason "${expectedReason}", but it reverted with reason "${reason}".`,
  );
}
