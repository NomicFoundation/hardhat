import type { ReadContractReturnType, WriteContractReturnType } from "viem";

import assert from "node:assert/strict";

import { ensureError } from "@nomicfoundation/hardhat-utils/error";
import { decodeErrorResult } from "viem";

import { extractRevertData } from "./extract-revert-data.js";
import { isDefaultRevert } from "./is-default-revert.js";

export async function handleRevert(
  contractFn: Promise<ReadContractReturnType | WriteContractReturnType>,
): Promise<string> {
  try {
    await contractFn;
  } catch (error) {
    ensureError(error);

    const data = extractRevertData(error);

    if (isDefaultRevert(data) === false) {
      assert.fail(
        `Expected default error revert, but got a custom error selector "${data.slice(0, 10)}" with data "${data}"`,
      );
    }

    const { args } = decodeErrorResult({ data });

    // In the case of default ETH errors, the array contains only a single element
    return String(args[0]);
  }

  assert.fail("The function was expected to revert, but it did not.");
}
