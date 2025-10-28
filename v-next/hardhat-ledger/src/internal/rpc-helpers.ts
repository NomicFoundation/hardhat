import type {
  FailedJsonRpcResponse,
  JsonRpcResponse,
  RequestArguments,
  SuccessfulJsonRpcResponse,
} from "hardhat/types/providers";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { isObject } from "@nomicfoundation/hardhat-utils/lang";

export function isJsonRpcResponse(
  payload: unknown,
): payload is JsonRpcResponse {
  if (!isObject(payload)) {
    return false;
  }

  if (payload.jsonrpc !== "2.0") {
    return false;
  }

  if (
    typeof payload.id !== "number" &&
    typeof payload.id !== "string" &&
    payload.id !== null
  ) {
    return false;
  }

  if (payload.result === undefined && payload.error === undefined) {
    return false;
  }

  if (payload.error !== undefined) {
    if (!isObject(payload.error)) {
      return false;
    }

    if (typeof payload.error.code !== "number") {
      return false;
    }

    if (typeof payload.error.message !== "string") {
      return false;
    }
  }

  return true;
}

export function isSuccessfulJsonRpcResponse(
  payload: JsonRpcResponse,
): payload is SuccessfulJsonRpcResponse {
  return "result" in payload;
}

export function isFailedJsonRpcResponse(
  payload: JsonRpcResponse,
): payload is FailedJsonRpcResponse {
  return "error" in payload && payload.error !== undefined;
}

export function getRequestParams(
  requestArguments: RequestArguments,
): unknown[] {
  if (requestArguments.params === undefined) {
    return [];
  }

  if (Array.isArray(requestArguments.params)) {
    return requestArguments.params;
  }

  throw new HardhatError(
    HardhatError.ERRORS.CORE.NETWORK.INVALID_REQUEST_PARAMS,
  );
}
