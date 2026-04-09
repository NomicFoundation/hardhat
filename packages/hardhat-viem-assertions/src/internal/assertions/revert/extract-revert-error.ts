import type { Hex } from "viem";

import { assertHardhatInvariant } from "@nomicfoundation/hardhat-errors";
import { ensureError } from "@nomicfoundation/hardhat-utils/error";
import {
  ContractFunctionExecutionError,
  ContractFunctionRevertedError,
} from "viem";

/**
 * Extracts the revert data hex string from a viem contract error.
 *
 * When a contract call reverts, viem throws a
 * `ContractFunctionExecutionError` whose cause is a
 * `ContractFunctionRevertedError` that carries the raw hex revert data
 * in its `raw` property.
 *
 * @param error - The thrown viem `Error` object.
 * @returns An object with the error `name`, `message`, and `data` (`0x`-prefixed hex revert data).
 *
 * @throws If the error is not the expected viem revert error structure.
 */
export function extractRevertError(error: unknown): {
  name: string;
  message: string;
  data: Hex;
} {
  ensureError(error, ContractFunctionExecutionError);

  const { cause } = error;

  ensureError(cause, ContractFunctionRevertedError);

  assertHardhatInvariant(
    cause.raw !== undefined,
    `Expected raw revert data on ContractFunctionRevertedError, but got none. Error: "${cause.message}"`,
  );

  return {
    name: error.name,
    message: cause.message,
    data: cause.raw,
  };
}
