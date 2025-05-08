import type {
  ContractAbis,
  ContractReturnType,
} from "@nomicfoundation/hardhat-viem/types";
import type { ReadContractReturnType, WriteContractReturnType } from "viem";

import { handleRevertWithCustomError } from "./core-revert-with-custom-error.js";

export async function revertWithCustomError<
  ContractName extends keyof ContractAbis,
>(
  promise: Promise<ReadContractReturnType | WriteContractReturnType>,
  contract: ContractReturnType<ContractName>,
  customErrorName: string,
): Promise<void> {
  await handleRevertWithCustomError(promise, contract, customErrorName);
}
