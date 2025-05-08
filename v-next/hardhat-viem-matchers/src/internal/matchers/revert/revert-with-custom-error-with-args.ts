import type {
  ContractAbis,
  ContractReturnType,
} from "@nomicfoundation/hardhat-viem/types";
import type { ReadContractReturnType, WriteContractReturnType } from "viem";

import assert from "node:assert/strict";

import { handleRevertWithCustomError } from "./core-revert-with-custom-error.js";

export async function revertWithCustomErrorWithArgs<
  ContractName extends keyof ContractAbis,
>(
  promise: Promise<ReadContractReturnType | WriteContractReturnType>,
  contract: ContractReturnType<ContractName>,
  customErrorName: string,
  args: any[],
): Promise<void> {
  const errorArgs = await handleRevertWithCustomError(
    promise,
    contract,
    customErrorName,
  );

  assert.deepEqual(
    errorArgs,
    args,
    `The function was expected to revert with arguments "${args.join(", ")}", but it reverted with arguments "${errorArgs.join(", ")}".`,
  );
}
