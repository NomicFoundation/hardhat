import type {
  FailedJsonRpcResponse,
  JsonRpcRequest,
  JsonRpcResponse,
  RequestArguments,
  SuccessfulJsonRpcResponse,
} from "../../../types/providers.js";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { isObject } from "@nomicfoundation/hardhat-utils/lang";

/**
 * Gets a JSON-RPC 2.0 request object.
 * See https://www.jsonrpc.org/specification#request_object
 */
export function getJsonRpcRequest(
  id: number | string,
  method: string,
  params?: unknown[] | object,
): JsonRpcRequest {
  const requestObject: JsonRpcRequest = {
    jsonrpc: "2.0",
    id,
    method,
  };

  requestObject.params = getRequestParams({ method, params });

  return requestObject;
}

export function parseJsonRpcResponse(text: string): JsonRpcResponse {
  try {
    const json: unknown = JSON.parse(text);

    if (!isJsonRpcResponse(json)) {
      /* eslint-disable-next-line no-restricted-syntax -- allow throwing a
      generic error here as it will be handled in the catch block */
      throw new Error("Invalid JSON-RPC response");
    }

    return json;
  } catch {
    throw new HardhatError(
      HardhatError.ERRORS.CORE.NETWORK.INVALID_JSON_RESPONSE,
      {
        response: text,
      },
    );
  }
}

export function isJsonRpcRequest(payload: unknown): payload is JsonRpcRequest {
  if (!isObject(payload)) {
    return false;
  }

  if (payload.jsonrpc !== "2.0") {
    return false;
  }

  if (typeof payload.id !== "number" && typeof payload.id !== "string") {
    return false;
  }

  if (typeof payload.method !== "string") {
    return false;
  }

  if (!Array.isArray(payload.params)) {
    return false;
  }

  return true;
}

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
