import type {
  Hex,
  ReadContractReturnType,
  WriteContractReturnType,
} from "viem";

import assert from "node:assert/strict";

import { ensureError } from "@nomicfoundation/hardhat-utils/error";
import { decodeErrorResult } from "viem";

import { isKnownErrorSelector } from "./error-string.js";
import { extractRevertError } from "./extract-revert-error.js";

export async function handleRevert(
  contractFn: Promise<ReadContractReturnType | WriteContractReturnType>,
): Promise<
  | {
      args: string[];
      isPanicError: boolean;
      data: Hex;
    }
  | {
      errorWithoutReason: true;
    }
> {
  try {
    await contractFn;
  } catch (error) {
    ensureError(error);

    const rawError = extractRevertError(error);

    if (
      isKnownErrorSelector(rawError.data) === false &&
      rawError.data !== "0x"
    ) {
      assert.fail(
        `The function was expected to revert with a non custom error, but it instead reverted with a custom error. ${rawError.message}`,
      );
    }

    if (rawError.data === "0x") {
      return {
        errorWithoutReason: true,
      };
    }

    const decodedError = decodeErrorResult({ data: rawError.data });

    return {
      args: decodedError.args.map((a) => String(a)),
      isPanicError: decodedError.errorName === "Panic",
      data: rawError.data,
    };
  }

  assert.fail("The function was expected to revert, but it did not revert");
}
