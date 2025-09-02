import type { ReadContractReturnType, WriteContractReturnType } from "viem";

import assert from "node:assert/strict";

import { decodeErrorResult } from "viem";

import { isKnownErrorString } from "./error-string.js";
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
    const decodedOrRawError = extractRevertError(error);

    if (decodedOrRawError.data === undefined) {
      return {
        message: decodedOrRawError.decodedMessage,
        args: [],
      };
    }

    if (isKnownErrorString(decodedOrRawError.data) === false) {
      assert.fail(
        `Expected non custom error string, but got a custom error selector "${decodedOrRawError.data.slice(0, 10)}" with data "${decodedOrRawError.data}"`,
      );
    }

    const decodedError = decodeErrorResult({ data: decodedOrRawError.data });

    return {
      message: decodedOrRawError.message,
      args: decodedError.args.map((a) => String(a)),
      isPanicError: decodedError.errorName === "Panic",
    };
  }

  assert.fail("The function was expected to revert, but it did not.");
}
