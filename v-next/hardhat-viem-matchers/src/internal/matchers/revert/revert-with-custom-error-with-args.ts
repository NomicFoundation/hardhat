import { cleanupAnyValue } from "../anyvalue.js";

import type {
  ContractAbis,
  ContractReturnType,
} from "@nomicfoundation/hardhat-viem/types";
import type { ReadContractReturnType, WriteContractReturnType } from "viem";

import assert from "node:assert/strict";

import { handleRevertWithCustomError } from "./handle-revert-with-custom-error.js";

export async function revertWithCustomErrorWithArgs<
  ContractName extends keyof ContractAbis,
>(
  contractFn: Promise<ReadContractReturnType | WriteContractReturnType>,
  contract: ContractReturnType<ContractName>,
  customErrorName: string,
  args: any[],
): Promise<void> {
  const errorArgs = await handleRevertWithCustomError(
    contractFn,
    contract,
    customErrorName,
  );

  cleanupAnyValue(args, errorArgs)

  assert.deepEqual(
    errorArgs,
    args,
    `Error "${customErrorName}" expected with arguments "${args.join(", ")}",\n but it reverted with arguments "${errorArgs.join(", ")}".`,
  );
}
