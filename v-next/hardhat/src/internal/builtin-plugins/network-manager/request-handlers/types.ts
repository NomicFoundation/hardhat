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
  handle(
    jsonRpcRequest: JsonRpcRequest,
  ): Promise<JsonRpcRequest | JsonRpcResponse>;
}
