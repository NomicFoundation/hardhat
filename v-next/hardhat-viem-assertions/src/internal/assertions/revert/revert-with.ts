import type { ReadContractReturnType, WriteContractReturnType } from "viem";

import assert from "node:assert/strict";

import { numberToHexString } from "@nomicfoundation/hardhat-utils/hex";

import { handleRevert } from "./handle-revert.js";

export async function revertWith(
  contractFn: Promise<ReadContractReturnType | WriteContractReturnType>,
  expectedRevertReason: string,
): Promise<void> {
  const reason = await handleRevert(contractFn);

  let actualArg = "";
  let errMsg = "";
  if (reason.isPanicError) {
    // If the error is a panic error, convert the argument to hex and include additional failure details.
    // Otherwise, only the panic error code will be present in the arguments (e.g., "args": ["17"]).
    // The argument represents the panic error code, for example:
    // In hexadecimal: 0x11
    // In decimal: 17
    // Meaning: Arithmetic overflow or underflow
    actualArg = numberToHexString(parseInt(reason.args[0], 10));

    errMsg =
      `The function was expected to revert with reason "${expectedRevertReason}", but it reverted with reason: ${actualArg}. ` +
      `This is the result of a panic error: ${reason.message}`;
  } else {
    actualArg = reason.args[0];
    errMsg = `The function was expected to revert with reason "${expectedRevertReason}", but it reverted with reason: ${actualArg}.`;
  }

  assert.equal(actualArg, expectedRevertReason, errMsg);
}
