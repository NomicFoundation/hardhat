import type { Result } from "ethers/abi";
import type { TransactionRequest, TransactionResponse } from "ethers/providers";

import { ensureError } from "@nomicfoundation/hardhat-utils/error";
import { assert as chaiAssert, AssertionError } from "chai";
import { AbiCoder, decodeBytes32String } from "ethers/abi";

import { panicErrorCodeToReason } from "./panic.js";

type TransactionRevertData =
  | { kind: "NotTransaction" }
  | { kind: "Success" }
  | { kind: "Revert"; returnData?: string; retrievalError?: unknown };

interface TransactionRevertDataRecovery {
  returnData?: string;
  retrievalError?: unknown;
}

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

export async function getTransactionRevertData(
  value: unknown,
): Promise<TransactionRevertData> {
  if (!isProviderBackedTransactionResponse(value)) {
    return { kind: "NotTransaction" };
  }

  const receipt = await value.provider.waitForTransaction(value.hash);
  if (receipt === null) {
    return { kind: "NotTransaction" };
  }

  if (receipt.status !== 0) {
    return { kind: "Success" };
  }

  return {
    kind: "Revert",
    ...(await getReturnDataFromTransaction(value, receipt.blockNumber)),
  };
}

export function throwRevertDataNotRetrievedError(
  message: string,
  cause?: unknown,
): never {
  try {
    chaiAssert.fail(message);
  } catch (error) {
    ensureError(error);

    if (cause !== undefined) {
      error.cause = cause;
    }

    throw error;
  }
}

export class ErrorWithData extends Error {
  public readonly data: string;

  constructor(data: string) {
    super();
    this.data = data;
  }
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

export function hasTransactionHash(x: unknown): x is { hash: unknown } {
  return typeof x === "object" && x !== null && "hash" in x;
}

function isProviderBackedTransactionResponse(
  x: unknown,
): x is TransactionResponse {
  return (
    hasTransactionHash(x) &&
    typeof x.hash === "string" &&
    "provider" in x &&
    typeof x.provider === "object" &&
    x.provider !== null &&
    "waitForTransaction" in x.provider &&
    typeof x.provider.waitForTransaction === "function" &&
    "call" in x.provider &&
    typeof x.provider.call === "function"
  );
}

async function getReturnDataFromTransaction(
  tx: TransactionResponse,
  blockNumber: number,
): Promise<TransactionRevertDataRecovery> {
  try {
    await tx.provider.call(buildReplayTransactionRequest(tx, blockNumber));
  } catch (error) {
    try {
      return { returnData: getReturnDataFromError(error) };
    } catch {
      return { retrievalError: error };
    }
  }

  return {};
}

function buildReplayTransactionRequest(
  tx: TransactionResponse,
  blockNumber: number,
): TransactionRequest {
  const request: TransactionRequest = {
    blockTag: blockNumber,
    chainId: tx.chainId,
    data: tx.data,
    from: tx.from,
    gasLimit: tx.gasLimit,
    nonce: tx.nonce,
    to: tx.to ?? undefined,
    type: tx.type,
    value: tx.value,
  };

  if (isDefined(tx.maxFeePerGas) || isDefined(tx.maxPriorityFeePerGas)) {
    request.maxFeePerGas = tx.maxFeePerGas ?? undefined;
    request.maxPriorityFeePerGas = tx.maxPriorityFeePerGas ?? undefined;
  } else if (isDefined(tx.gasPrice)) {
    request.gasPrice = tx.gasPrice;
  }

  if (isDefined(tx.accessList)) {
    request.accessList = tx.accessList;
  }

  if (isDefined(tx.maxFeePerBlobGas)) {
    request.maxFeePerBlobGas = tx.maxFeePerBlobGas;
  }

  if (isDefined(tx.blobVersionedHashes)) {
    request.blobVersionedHashes = tx.blobVersionedHashes;
  }

  if (isDefined(tx.authorizationList)) {
    request.authorizationList = tx.authorizationList;
  }

  return request;
}

function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}
