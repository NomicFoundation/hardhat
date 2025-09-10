import assert from "node:assert/strict";

import { toBigInt } from "@nomicfoundation/hardhat-utils/bigint";
import { numberToHexString } from "@nomicfoundation/hardhat-utils/hex";
import { panicErrorCodeToMessage } from "@nomicfoundation/hardhat-utils/panic-errors";
import {
  type ReadContractReturnType,
  type WriteContractReturnType,
} from "viem";

import { handleRevert } from "./handle-revert.js";

export async function revertWith(
  contractFn: Promise<ReadContractReturnType | WriteContractReturnType>,
  expectedRevertReason: string,
): Promise<void> {
  const reason = await handleRevert(contractFn);

  if ("errorWithoutReason" in reason) {
    assert.fail(
      `The function was expected to revert with reason "${expectedRevertReason}", but it reverted without a reason`,
    );
  }

  let actualArg = "";
  let errMsg = "";
  if (reason.isPanicError) {
    const errCode = toBigInt(reason.args[0]);
    actualArg = numberToHexString(errCode);

    errMsg = `The function was expected to revert with reason "${expectedRevertReason}", but it ${panicErrorCodeToMessage(errCode)}.`;
  } else {
    actualArg = reason.args[0];
    errMsg = `The function was expected to revert with reason "${expectedRevertReason}", but it reverted with reason: ${actualArg}.`;
  }

  assert.equal(actualArg, expectedRevertReason, errMsg);
}
