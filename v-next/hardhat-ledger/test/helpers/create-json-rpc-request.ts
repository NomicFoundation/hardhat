import type { JsonRpcRequest } from "hardhat/types/providers";

export function createJsonRpcRequest(
  method: string,
  params: any[] = [],
): JsonRpcRequest {
  return {
    jsonrpc: "2.0",
    id: 1,
    method,
    params,
  };
}
