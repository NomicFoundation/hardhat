import type {
  JsonRpcRequest,
  JsonRpcResponse,
} from "../../../../types/providers.js";

/**
 * Common interface for request handlers, which can either return a new
 * modified request, or a response.
 *
 * If they return a request, it's passed to the next handler, or to the "next"
 * function if there are no more handlers.
 *
 * If they return a response, it's returned immediately.
 *
 */
export interface RequestHandler {
  /**
   * A guard to ensure the request is supported by the handler.
   * If the handler does not support the request, then it can be safely
   * skipped.
   *
   * @param jsonRpcRequest - The JSON-RPC request to check.
   * @returns true if the method will be processed by the handler, false otherwise.
   */
  isSupportedMethod(jsonRpcRequest: JsonRpcRequest): boolean;

  handle(
    jsonRpcRequest: JsonRpcRequest,
  ): Promise<JsonRpcRequest | JsonRpcResponse>;
}
