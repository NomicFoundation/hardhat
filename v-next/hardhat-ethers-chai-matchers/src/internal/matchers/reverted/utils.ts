import type { Result } from "ethers/abi";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { ensureError } from "@nomicfoundation/hardhat-utils/error";
import { AssertionError } from "chai";
import { AbiCoder, decodeBytes32String } from "ethers/abi";

import { panicErrorCodeToReason } from "./panic.js";

// method id of 'Error(string)'
const ERROR_STRING_PREFIX = "0x08c379a0";

// method id of 'Panic(uint256)'
const PANIC_CODE_PREFIX = "0x4e487b71";

/**
 * Try to obtain the return data of a transaction from the given value.
 *
 * If the value is an error but it doesn't have data, we assume it's not related
 * to a reverted transaction and we re-throw it.
 */
export function getReturnDataFromError(error: any): string {
  if (!(error instanceof Error)) {
    // eslint-disable-next-line no-restricted-syntax -- keep the original chai error structure
    throw new AssertionError("Expected an Error object");
  }

  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- some properties do not exist in the default Error instance
  const typedError = error as any;

  const errorData = typedError.data ?? typedError.error?.data;

  if (errorData === undefined) {
    // eslint-disable-next-line no-restricted-syntax -- re-throw because the error is not related to a reverted transaction
    throw error;
  }

  const returnData = typeof errorData === "string" ? errorData : errorData.data;

  if (returnData === undefined || typeof returnData !== "string") {
    // eslint-disable-next-line no-restricted-syntax -- re-throw because the error is not related to a reverted transaction
    throw error;
  }

  return returnData;
}

type DecodedReturnData =
  | {
      kind: "Error";
      reason: string;
    }
  | {
      kind: "Empty";
    }
  | {
      kind: "Panic";
      code: bigint;
      description: string;
    }
  | {
      kind: "Custom";
      id: string;
      data: string;
    };

export function decodeReturnData(returnData: string): DecodedReturnData {
  const abi = new AbiCoder();

  if (returnData === "0x") {
    return { kind: "Empty" };
  } else if (returnData.startsWith(ERROR_STRING_PREFIX)) {
    const encodedReason = returnData.slice(ERROR_STRING_PREFIX.length);
    let reason: string;

    try {
      reason = abi.decode(["string"], `0x${encodedReason}`)[0];
    } catch (e) {
      ensureError(e);

      throw new HardhatError(HardhatError.ERRORS.CHAI_MATCHERS.DECODING_ERROR, {
        encodedData: encodedReason,
        type: "string",
        reason: e.message,
      });
    }

    return {
      kind: "Error",
      reason,
    };
  } else if (returnData.startsWith(PANIC_CODE_PREFIX)) {
    const encodedReason = returnData.slice(PANIC_CODE_PREFIX.length);
    let code: bigint;
    try {
      code = abi.decode(["uint256"], `0x${encodedReason}`)[0];
    } catch (e) {
      ensureError(e);

      throw new HardhatError(HardhatError.ERRORS.CHAI_MATCHERS.DECODING_ERROR, {
        encodedData: encodedReason,
        type: "uint256",
        reason: e.message,
      });
    }

    const description = panicErrorCodeToReason(code) ?? "unknown panic code";

    return {
      kind: "Panic",
      code,
      description,
    };
  }

  return {
    kind: "Custom",
    id: returnData.slice(0, 10),
    data: `0x${returnData.slice(10)}`,
  };
}

/**
 * Takes an ethers result object and converts it into a (potentially nested) array.
 *
 * For example, given this error:
 *
 *   struct Point(uint x, uint y)
 *   error MyError(string, Point)
 *
 *   revert MyError("foo", Point(1, 2))
 *
 * The resulting array will be: ["foo", [1n, 2n]]
 */
export function resultToArray(result: Result): any[] {
  return result
    .toArray()
    .map((x) =>
      typeof x === "object" && x !== null && "toArray" in x
        ? resultToArray(x)
        : x,
    );
}

export function parseBytes32String(v: string): string {
  return decodeBytes32String(v);
}
