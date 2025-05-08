import type {
  ContractAbis,
  ContractReturnType,
} from "@nomicfoundation/hardhat-viem/types";
import type { ReadContractReturnType, WriteContractReturnType } from "viem";

import assert from "node:assert/strict";

import { assertHardhatInvariant } from "@nomicfoundation/hardhat-errors";
import { ensureError } from "@nomicfoundation/hardhat-utils/error";
import { decodeErrorResult } from "viem";

import { extractRevertData } from "./extract-revert-data.js";

export async function handleRevertWithCustomError<
  ContractName extends keyof ContractAbis,
>(
  promise: Promise<ReadContractReturnType | WriteContractReturnType>,
  contract: ContractReturnType<ContractName>,
  customErrorName: string,
): Promise<unknown[]> {
  try {
    await promise;
  } catch (error) {
    ensureError(error);

    const data = extractRevertData(error);

    try {
      const { abiItem, args } = decodeErrorResult({ data, abi: contract.abi });

      assertHardhatInvariant(
        abiItem.type === "error",
        `Expected error, but the type is "${abiItem.type}".`,
      );

      assert.equal(
        abiItem.name,
        customErrorName,
        `Expected error name: "${customErrorName}", but found "${abiItem.name}".`,
      );

      return Array.isArray(args) ? [...args] : [];
    } catch (decodeError) {
      ensureError(decodeError);

      if (decodeError.name !== "AbiErrorSignatureNotFoundError") {
        throw decodeError;
      }

      assert.fail(
        `The error "${customErrorName}" was not found in the contract ABI. Encoded error signature found: "${data}".`,
      );
    }
  }

  assert.fail("The function was expected to revert, but it did not.");
}
