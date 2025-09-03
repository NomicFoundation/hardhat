import type { ReadContractReturnType, WriteContractReturnType } from "viem";

import assert from "node:assert/strict";

import { ensureError } from "@nomicfoundation/hardhat-utils/error";
import { decodeErrorResult } from "viem";

import { isKnownErrorSelector } from "./error-string.js";
import { extractRevertError } from "./extract-revert-error.js";

interface RevertInfo {
  message: string;
  args: string[];
  isPanicError: boolean;
}

export async function handleRevert(
  contractFn: Promise<ReadContractReturnType | WriteContractReturnType>,
): Promise<RevertInfo> {
  try {
    await contractFn;
  } catch (error) {
    ensureError(error);

    const rawError = extractRevertError(error);

    if (isKnownErrorSelector(rawError.data) === false) {
      assert.fail(
        `Expected non custom error string, but got a custom error selector "${rawError.data.slice(0, 10)}" with data "${rawError.data}"`,
      );
    }

    const decodedError = decodeErrorResult({ data: rawError.data });

    return {
      message: rawError.message,
      args: decodedError.args.map((a) => String(a)),
      isPanicError: decodedError.errorName === "Panic",
    };
  }

  assert.fail("The function was expected to revert, but it did not.");
}
