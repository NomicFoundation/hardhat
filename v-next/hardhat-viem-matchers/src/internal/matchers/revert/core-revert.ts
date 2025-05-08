import assert from "node:assert/strict";

import { ensureError } from "@nomicfoundation/hardhat-utils/error";
import { decodeErrorResult } from "viem";

import { extractRevertData } from "./extract-revert-data.js";

export async function handleRevert(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (error) {
    ensureError(error);

    const data = extractRevertData(error);

    const { args } = decodeErrorResult({ data });

    // In the case of default ETH errors, the array contains only a single element
    return String(args[0]);
  }

  assert.fail("The function was expected to revert, but it did not.");
}
