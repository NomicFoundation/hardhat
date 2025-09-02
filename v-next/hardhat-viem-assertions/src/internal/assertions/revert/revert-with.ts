import type { ReadContractReturnType, WriteContractReturnType } from "viem";

import assert from "node:assert/strict";

import { handleRevert } from "./handle-revert.js";

export async function revertWith(
  contractFn: Promise<ReadContractReturnType | WriteContractReturnType>,
  expectedRevertReason: string,
): Promise<void> {
  const reason = await handleRevert(contractFn);

  assert.equal(
    reason.args[0] ?? reason.message, // For Viem errors, there are no args, so use the error message
    expectedRevertReason,
    `The function was expected to revert with reason "${expectedRevertReason}", but it reverted with reason: ${reason.args[0] ?? reason.message}.` +
      // If it is a panic error, add additional error info
      `${reason.isPanicError ? ` This is the result of a panic error: ${reason.message}` : ""}`,
  );
}
