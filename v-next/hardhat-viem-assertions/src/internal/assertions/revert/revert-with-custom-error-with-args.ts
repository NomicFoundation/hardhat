import type {
  ContractAbis,
  ContractReturnType,
} from "@nomicfoundation/hardhat-viem/types";
import type { ReadContractReturnType, WriteContractReturnType } from "viem";

import assert from "node:assert/strict";

import { stringifyArgs } from "../../helpers.js";
import { isArgumentMatch } from "../../predicates.js";

import { handleRevertWithCustomError } from "./handle-revert-with-custom-error.js";

export async function revertWithCustomErrorWithArgs<
  ContractName extends keyof ContractAbis,
>(
  contractFn: Promise<ReadContractReturnType | WriteContractReturnType>,
  contract: ContractReturnType<ContractName>,
  customErrorName: string,
  expectedArgs: any[],
): Promise<void> {
  const errorArgs = await handleRevertWithCustomError(
    contractFn,
    contract,
    customErrorName,
  );

  if (await isArgumentMatch(errorArgs, expectedArgs)) {
    return;
  }

  // No match, then show error
  if (expectedArgs.some((arg) => typeof arg === "function")) {
    // If there are predicate matchers, we can't use the built-in deepEqual with diff
    const displayExpectedArgs = expectedArgs.map((expectedArg) =>
      typeof expectedArg === "function" ? "<predicate>" : expectedArg,
    );

    assert.fail(
      `The error arguments do not match the expected ones:\nExpected: ${stringifyArgs(displayExpectedArgs)}\nRaised: ${stringifyArgs(errorArgs)}`,
    );
  } else {
    // Otherwise, we can use it
    assert.deepEqual(
      errorArgs,
      expectedArgs,
      `The function was expected to revert with arguments "${expectedArgs.join(", ")}", but it reverted with arguments "${errorArgs.join(", ")}".`,
    );
  }
}
