import type { Result } from "ethers/abi";

import { ensureError } from "@nomicfoundation/hardhat-utils/error";
import { isKnownEvmExecutionErrorMessage } from "@nomicfoundation/hardhat-utils/eth";
import { assert as chaiAssert, AssertionError } from "chai";
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
export function getReturnDataFromError(error: unknown): string {
  if (!(error instanceof Error)) {
    // eslint-disable-next-line no-restricted-syntax -- keep the original chai error structure
    throw new AssertionError("Expected an Error object");
  }

  const errorData = getErrorData(error);

  if (errorData === undefined) {
    // eslint-disable-next-line no-restricted-syntax -- re-throw because the error is not related to a reverted transaction
    throw error;
  }

  const returnData = getReturnData(errorData);

  if (returnData === undefined || typeof returnData !== "string") {
    // eslint-disable-next-line no-restricted-syntax -- re-throw because the error is not related to a reverted transaction
    throw error;
  }

  return returnData;
}

/**
 * Some JSON-RPC clients report EVM execution failures from eth_call or
 * eth_estimateGas without return data. These can satisfy the broad revert
 * matcher, but reason-specific matchers still need actual return data.
 */
export function isNoDataExecutionError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    isEthersCallExceptionWithoutData(error) ||
    isProviderExecutionErrorWithoutData(error)
  );
}

function isEthersCallExceptionWithoutData(error: Error): boolean {
  if (
    getObjectProperty(error, "code") !== "CALL_EXCEPTION" ||
    (getObjectProperty(error, "action") !== "call" &&
      getObjectProperty(error, "action") !== "estimateGas") ||
    getObjectProperty(error, "data") !== null ||
    getObjectProperty(error, "reason") !== null ||
    getObjectProperty(error, "shortMessage") !== "missing revert data"
  ) {
    return false;
  }

  const info = getObjectProperty(error, "info");
  const rpcError = getObjectProperty(info, "error");
  const rpcErrorCode = getObjectProperty(rpcError, "code");
  const rpcErrorData = getObjectProperty(rpcError, "data");
  const rpcErrorMessage = getObjectProperty(rpcError, "message");

  return (
    typeof rpcErrorMessage === "string" &&
    isKnownEvmExecutionErrorMessage(rpcErrorMessage) &&
    hasJsonRpcExecutionErrorCodeOrNoCodeWithoutData(rpcErrorCode, rpcErrorData)
  );
}

function isProviderExecutionErrorWithoutData(error: Error): boolean {
  const errorData = getErrorData(error);
  const code = getJsonRpcErrorProperty(error, "code");
  const message = getJsonRpcErrorProperty(error, "message");

  return (
    getReturnData(errorData) === undefined &&
    isJsonRpcExecutionErrorCode(code) &&
    typeof message === "string" &&
    isKnownEvmExecutionErrorMessage(message)
  );
}

function hasJsonRpcExecutionErrorCodeOrNoCodeWithoutData(
  code: unknown,
  data: unknown,
): boolean {
  return (
    getReturnData(data) === undefined &&
    (code === undefined || isJsonRpcExecutionErrorCode(code))
  );
}

function getErrorData(error: Error): unknown {
  const nestedError = getObjectProperty(error, "error");

  return (
    getObjectProperty(error, "data") ?? getObjectProperty(nestedError, "data")
  );
}

function getReturnData(errorData: unknown): string | undefined {
  if (typeof errorData === "string") {
    return errorData;
  }

  const nestedData = getObjectProperty(errorData, "data");

  return typeof nestedData === "string" ? nestedData : undefined;
}

function isJsonRpcExecutionErrorCode(code: unknown): boolean {
  return code === 3 || code === -32000 || code === -32003;
}

function getJsonRpcErrorProperty(error: Error, key: string): unknown {
  const nestedError = getObjectProperty(error, "error");

  return getObjectProperty(nestedError, key) ?? getObjectProperty(error, key);
}

function getObjectProperty(value: unknown, key: string): unknown {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }

  return Reflect.get(value, key);
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
    } catch (cause) {
      ensureError(cause);

      try {
        chaiAssert.fail(
          `There was an error decoding "${encodedReason}" as "string". Reason: ${cause.message}`,
        );
      } catch (e) {
        ensureError(e);
        e.cause = cause;
        throw e;
      }
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
    } catch (cause) {
      ensureError(cause);

      try {
        chaiAssert.fail(
          `There was an error decoding "${encodedReason}" as a "uint256". Reason: ${cause.message}`,
        );
      } catch (e) {
        ensureError(e);
        e.cause = cause;
        throw e;
      }
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
