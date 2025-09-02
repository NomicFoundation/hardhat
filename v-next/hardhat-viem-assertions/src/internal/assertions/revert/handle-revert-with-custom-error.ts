import type {
  ContractAbis,
  ContractReturnType,
} from "@nomicfoundation/hardhat-viem/types";
import type {
  ContractFunctionExecutionError,
  ReadContractReturnType,
  WriteContractReturnType,
} from "viem";

import assert from "node:assert/strict";

import { assertHardhatInvariant } from "@nomicfoundation/hardhat-errors";
import { ensureError } from "@nomicfoundation/hardhat-utils/error";
import { decodeErrorResult } from "viem";

import { getRevertErrorString, isKnownErrorString } from "./error-string.js";
import { extractRevertError } from "./extract-revert-error.js";

export async function handleRevertWithCustomError<
  ContractName extends keyof ContractAbis,
>(
  contractFn: Promise<ReadContractReturnType | WriteContractReturnType>,
  contract: ContractReturnType<ContractName>,
  customErrorName: string,
): Promise<unknown[]> {
  try {
    await contractFn;
  } catch (error) {
    ensureError<ContractFunctionExecutionError>(error);

    const contractAbi = Array.isArray(contract.abi)
      ? contract.abi
      : Object.values(contract.abi);

    const found = contractAbi.some(
      (abiItem) => abiItem.type === "error" && abiItem.name === customErrorName,
    );

    if (found === false) {
      assert.fail(`The error "${customErrorName}" does not exists in the abi.`);
    }

    const decodedOrRawError = extractRevertError(error);

    if (decodedOrRawError.data === undefined) {
      assert.fail(
        `Expected a custom error with name "${customErrorName}", but got a non custom error with name "${decodedOrRawError.name}" and error message: ${decodedOrRawError.decodedMessage}`,
      );
    }

    try {
      if (isKnownErrorString(decodedOrRawError.data)) {
        assert.fail(
          `Expected a custom error with name "${customErrorName}", but got a non custom error with error string "${getRevertErrorString(decodedOrRawError.data)}"`,
        );
      }

      const { abiItem, args } = decodeErrorResult({
        data: decodedOrRawError.data,
        abi: contract.abi,
      });

      assertHardhatInvariant(
        abiItem.type === "error",
        `Expected error, but the type is "${abiItem.type}".`,
      );

      assert.equal(
        abiItem.name,
        customErrorName,
        `Expected error name: "${customErrorName}", but found "${abiItem.name}".`,
      );

      return Array.isArray(args) ? args : [];
    } catch (decodeError) {
      ensureError(decodeError);

      if (decodeError.name !== "AbiErrorSignatureNotFoundError") {
        throw decodeError;
      }

      assert.fail(
        `The error "${customErrorName}" was not found in the contract ABI. Encoded error signature found: "${decodedOrRawError.data}".`,
      );
    }
  }

  assert.fail(
    `The function was expected to revert with "${customErrorName}", but it did not.`,
  );
}
