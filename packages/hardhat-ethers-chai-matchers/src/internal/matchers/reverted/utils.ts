import type { Result } from "ethers/abi";
import type { TransactionRequest, TransactionResponse } from "ethers/providers";

import { ensureError } from "@nomicfoundation/hardhat-utils/error";
import { isObject } from "@nomicfoundation/hardhat-utils/lang";
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
  if (returnData === undefined) {
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

/**
 * Returns true when the error is the one ethers throws after a failed
 * `eth_call` or `eth_estimateGas` that came back without any revert data.
 *
 * In that case ethers wraps the failure in a `CALL_EXCEPTION` with no data or
 * reason and the short message "missing revert data", while keeping the
 * original provider error under `error.info.error`. We only treat it as a
 * no-data revert when that original error also looks like a known EVM
 * execution failure (matching by message, and by code when it has one).
 */
function isEthersCallExceptionWithoutData(error: Error): boolean {
  if (!isObject(error)) {
    return false;
  }

  if (
    error.code !== "CALL_EXCEPTION" ||
    (error.action !== "call" && error.action !== "estimateGas") ||
    error.data !== null ||
    error.reason !== null ||
    error.shortMessage !== "missing revert data"
  ) {
    return false;
  }

  if (!isObject(error.info)) {
    return false;
  }

  const rpcError = error.info.error;

  if (!isObject(rpcError)) {
    return false;
  }

  return (
    typeof rpcError.message === "string" &&
    isKnownEvmExecutionErrorMessage(rpcError.message) &&
    getReturnData(rpcError.data) === undefined &&
    // The ethers CALL_EXCEPTION wrapper already tells us this was a no-data
    // execution failure, so we don't insist on a code here and accept errors
    // that don't carry one (like Geth's plain errors). The provider branch has
    // no such wrapper to rely on, so there we do require a known code.
    (rpcError.code === undefined || isJsonRpcExecutionErrorCode(rpcError.code))
  );
}

/**
 * Returns true for an execution failure that a JSON-RPC provider reports
 * directly, instead of through ethers' call handling.
 *
 * Here the failure shows up as a plain provider error (sometimes nested one
 * level under `error.error`) that carries a known JSON-RPC execution code and a
 * known EVM execution message, but again has no revert data to work with.
 */
function isProviderExecutionErrorWithoutData(error: Error): boolean {
  if (!isObject(error)) {
    return false;
  }

  // Read code and message from the same source (the nested provider error if
  // present, otherwise the top-level error)
  const source = isObject(error.error) ? error.error : error;

  return (
    getReturnData(getErrorData(error)) === undefined &&
    isJsonRpcExecutionErrorCode(source.code) &&
    typeof source.message === "string" &&
    isKnownEvmExecutionErrorMessage(source.message)
  );
}

function getErrorData(error: Error): unknown {
  if (!isObject(error)) {
    return undefined;
  }

  const nestedError = isObject(error.error) ? error.error : undefined;

  return error.data ?? nestedError?.data;
}

function getReturnData(errorData: unknown): string | undefined {
  if (typeof errorData === "string") {
    return errorData;
  }

  if (isObject(errorData) && typeof errorData.data === "string") {
    return errorData.data;
  }

  return undefined;
}

function isJsonRpcExecutionErrorCode(code: unknown): boolean {
  return code === 3 || code === -32000 || code === -32003;
}

// Provider and Hardhat message formats that signal an EVM execution failure
// with no return data.
const EVM_EXECUTION_ERROR_MESSAGE_PATTERNS = [
  /^execution reverted\b/i,
  /^Transaction reverted (?:without a reason(?: string)?|and Hardhat couldn't infer the reason\.)/i,
  /^Transaction reverted: contract call run out of gas and made the transaction revert$/i,
  /^VM Exception while processing transaction: (?:invalid opcode|out of gas|reverted\b)/i,
  /(?:^|:\s*)invalid opcode\b/i,
];

/**
 * Checks if an error message is a known JSON-RPC provider message for an EVM
 * execution failure when no return data is available.
 */
export function isKnownEvmExecutionErrorMessage(message: string): boolean {
  return (
    EVM_EXECUTION_ERROR_MESSAGE_PATTERNS.some((pattern) =>
      pattern.test(message),
    ) || isEvmExceptionalHaltMessage(message)
  );
}

// This list is a verbatim copy of the `ExceptionalHalt` enum in
// `@nomicfoundation/edr`'s `index.d.ts`, which is the source of truth.
// It can silently drift on EDR bumps, so keep it in sync.
const EVM_EXCEPTIONAL_HALT_NAMES = new Set([
  "OutOfGas",
  "OpcodeNotFound",
  "InvalidFEOpcode",
  "InvalidJump",
  "NotActivated",
  "StackUnderflow",
  "StackOverflow",
  "OutOfOffset",
  "CreateCollision",
  "PrecompileError",
  "NonceOverflow",
  "CreateContractSizeLimit",
  "CreateContractStartingWithEF",
  "CreateInitCodeSizeLimit",
]);

function isEvmExceptionalHaltMessage(message: string): boolean {
  const [, haltName] = /^EVM error:?\s+([A-Z]\w*)/.exec(message) ?? [];

  return haltName !== undefined && EVM_EXCEPTIONAL_HALT_NAMES.has(haltName);
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
