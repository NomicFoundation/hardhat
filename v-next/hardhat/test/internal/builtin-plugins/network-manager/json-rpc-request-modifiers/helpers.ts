import type { JsonRpcRequest } from "../../../../../src/types/providers.js";

import { assertHardhatInvariant } from "@ignored/hardhat-vnext-errors";

export function createJsonRpcRequest(
  method: string,
  params?: unknown[] | object,
): JsonRpcRequest {
  return {
    jsonrpc: "2.0",
    id: 1,
    method,
    params: params ?? [],
  };
}

export function getParams(jsonRpcRequest: JsonRpcRequest): any[] | unknown[] {
  assertHardhatInvariant(
    Array.isArray(jsonRpcRequest.params),
    "params should be an array",
  );

  return jsonRpcRequest.params;
}
