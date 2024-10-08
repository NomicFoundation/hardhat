import type { Result } from "ethers";
import type ViemT from "viem";

import { AssertionError } from "chai";

import { HardhatChaiMatchersDecodingError } from "../errors";
import { panicErrorCodeToReason } from "./panic";

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
export function getReturnDataFromError(error: any): `0x${string}` {
  if (!(error instanceof Error)) {
    throw new AssertionError("Expected an Error object");
  }

  // cast to any again so we don't have to cast it every time we access
  // some property that doesn't exist on Error
  error = error as any;

  // a list of the possible locations for error return data
  // it varies based on a number of things:
  //   1. internal hardhat network or external
  //   2. read or write contract interation type
  //   3. ethers or viem
  //   4. probably a lot more
  const returnData: `0x${string}` | undefined = [
    error?.data,
    error?.error?.data,
    error?.data?.data,
    error?.error?.data?.data,
    error?.cause?.cause?.data,
    error?.cause?.cause?.data?.data,
    error?.cause?.cause?.cause?.data,
    error?.cause?.cause?.cause?.data?.data,
  ].find((data: any) => typeof data === "string" && data.startsWith("0x"));

  if (typeof returnData !== "string") {
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
  const { decodeAbiParameters, parseAbiParameters } =
    require("viem") as typeof ViemT;

  if (returnData === "0x") {
    return { kind: "Empty" };
  } else if (returnData.startsWith(ERROR_STRING_PREFIX)) {
    const encodedReason = returnData.slice(ERROR_STRING_PREFIX.length);
    let reason: string;
    try {
      reason = decodeAbiParameters(
        parseAbiParameters("string"),
        `0x${encodedReason}`
      )[0];
    } catch (e: any) {
      throw new HardhatChaiMatchersDecodingError(encodedReason, "string", e);
    }

    return {
      kind: "Error",
      reason,
    };
  } else if (returnData.startsWith(PANIC_CODE_PREFIX)) {
    const encodedReason = returnData.slice(PANIC_CODE_PREFIX.length);
    let code: bigint;
    try {
      code = decodeAbiParameters(
        parseAbiParameters("uint256"),
        `0x${encodedReason}`
      )[0];
    } catch (e: any) {
      throw new HardhatChaiMatchersDecodingError(encodedReason, "uint256", e);
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
        : x
    );
}

export function toBeHex(value: bigint) {
  let result = value.toString(16);
  // Ensure the value is of even length
  if (result.length % 2 === 1) {
    result = `0${result}`;
  }
  return `0x${result}`;
}
