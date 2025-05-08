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
import { isDefaultRevert } from "./is-default-revert.js";

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
    ensureError(error);

    let found = false;
    const contractAbi = Array.isArray(contract.abi)
      ? contract.abi
      : Object.values(contract.abi);
    for (const abiItem of contractAbi) {
      if (abiItem.type === "error" && abiItem.name === customErrorName) {
        found = true;
      }
    }

    if (found === false) {
      assert.fail(`The error "${customErrorName}" does not exists in the abi.`);
    }

    const data = extractRevertData(error);

    try {
      if (isDefaultRevert(data)) {
        assert.fail(
          `Expected a custom error with name "${customErrorName}", but got non custom error`,
        );
      }

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

  assert.fail(
    `The function was expected to revert with "${customErrorName}", but it did not.`,
  );
}
