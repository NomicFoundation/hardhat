import type {
  ContractAbis,
  ContractReturnType,
} from "@nomicfoundation/hardhat-viem/types";
import type { ReadContractReturnType, WriteContractReturnType } from "viem";

import assert from "node:assert/strict";

import { assertHardhatInvariant } from "@nomicfoundation/hardhat-errors";
import { ensureError } from "@nomicfoundation/hardhat-utils/error";
import { decodeErrorResult } from "viem";

import { isKnownErrorSelector, isPanicErrorSelector } from "./error-string.js";
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
    throwIfErrorIsNotInContract(contract, customErrorName);

    const rawError = extractRevertError(error);

    try {
      if (rawError.data === "0x") {
        assert.fail(
          `The function was expected to revert with custom error "${customErrorName}", but it reverted without a reason`,
        );
      }

      const { abiItem, args } = decodeErrorResult({
        data: rawError.data,
        abi: contract.abi,
      });

      if (isKnownErrorSelector(rawError.data)) {
        if (isPanicErrorSelector(rawError.data)) {
          assert.fail(
            `The function was expected to revert with custom error "${customErrorName}", but it reverted with a panic error: ${rawError.message}`,
          );
        }

        // Not a panic error; handle as a error string
        assertHardhatInvariant(
          Array.isArray(args),
          "Expected args to be an array",
        );

        assert.fail(
          `The function was expected to revert with custom error "${customErrorName}", but it reverted with reason "${args[0]}"`,
        );
      }

      assertHardhatInvariant(
        abiItem.type === "error",
        `Expected a custom error, but the error type is "${abiItem.type}".`,
      );

      assert.equal(
        abiItem.name,
        customErrorName,
        `The function was expected to revert with custom error "${customErrorName}", but it reverted with custom error "${abiItem.name}"`,
      );

      return Array.isArray(args) ? args : [];
    } catch (decodeError) {
      ensureError(decodeError);

      if (decodeError.name !== "AbiErrorSignatureNotFoundError") {
        throw decodeError;
      }

      assert.fail(
        `The error "${customErrorName}" was not found in the contract ABI. Encoded error signature found: "${rawError.data}".`,
      );
    }
  }

  assert.fail(
    `The function was expected to revert with custom error "${customErrorName}", but it did not revert`,
  );
}

function throwIfErrorIsNotInContract<ContractName extends keyof ContractAbis>(
  contract: ContractReturnType<ContractName>,
  customErrorName: string,
) {
  const contractAbi = Array.isArray(contract.abi)
    ? contract.abi
    : Object.values(contract.abi);

  const found = contractAbi.some(
    (abiItem) => abiItem.type === "error" && abiItem.name === customErrorName,
  );

  if (found === false) {
    assert.fail(
      `The given contract doesn't have a custom error named "${customErrorName}"`,
    );
  }
}
