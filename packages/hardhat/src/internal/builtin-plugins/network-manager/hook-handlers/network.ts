import type { HookContext, NetworkHooks } from "../../../../types/hooks.js";
import type {
  ChainType,
  NetworkConnection,
} from "../../../../types/network.js";
import type {
  JsonRpcRequest,
  JsonRpcResponse,
} from "../../../../types/providers.js";
import type { RequestHandler } from "../request-handlers/types.js";

import { AsyncMutex } from "@nomicfoundation/hardhat-utils/synchronization";

import { isJsonRpcResponse } from "../json-rpc.js";
import { createHandlersArray } from "../request-handlers/handlers-array.js";

export default async (): Promise<Partial<NetworkHooks>> => {
  // This map is essential for managing multiple network connections in Hardhat V3.
  // Since Hardhat V3 supports multiple connections, we use this map to track each one
  // and associate it with the corresponding handlers array.
  // When a connection is closed, its associated handlers array is removed from the map.
  // See the "closeConnection" function at the end of the file for more details.
  const requestHandlersPerConnection: WeakMap<
    NetworkConnection<ChainType | string>,
    RequestHandler[]
  > = new WeakMap();

  const initializationMutex = new AsyncMutex();

  const handlers: Partial<NetworkHooks> = {
    async onRequest<ChainTypeT extends ChainType | string>(
      context: HookContext,
      networkConnection: NetworkConnection<ChainTypeT>,
      jsonRpcRequest: JsonRpcRequest,
      next: (
        nextContext: HookContext,
        nextNetworkConnection: NetworkConnection<ChainTypeT>,
        nextJsonRpcRequest: JsonRpcRequest,
      ) => Promise<JsonRpcResponse>,
    ) {
      let requestHandlers = requestHandlersPerConnection.get(networkConnection);

      if (requestHandlers === undefined) {
        requestHandlers = await initializationMutex.exclusiveRun(async () => {
          // We check again in case another execution of this function
          // initialized the handlers while we were waiting for the mutex.
          const handlersPerConnectionAfterWaiting =
            requestHandlersPerConnection.get(networkConnection);

          if (handlersPerConnectionAfterWaiting !== undefined) {
            return handlersPerConnectionAfterWaiting;
          }

          const result = await createHandlersArray(networkConnection);

          requestHandlersPerConnection.set(networkConnection, result);

          return result;
        });
      }

      // We previously cloned here, but the performance impact is significant.
      // TODO: ensure the passed in request is not mutated by adapting the
      // handlers being applied here. See https://github.com/NomicFoundation/hardhat/issues/8090
      let updatedRequest = jsonRpcRequest;

      for (const handler of requestHandlers) {
        if (!handler.isSupportedMethod(updatedRequest)) {
          continue;
        }

        const newRequestOrResponse = await handler.handle(updatedRequest);

        if (isJsonRpcResponse(newRequestOrResponse)) {
          return newRequestOrResponse;
        }

        updatedRequest = newRequestOrResponse;
      }

      return await next(context, networkConnection, updatedRequest);
    },

    async closeConnection<ChainTypeT extends ChainType | string>(
      context: HookContext,
      networkConnection: NetworkConnection<ChainTypeT>,
      next: (
        nextContext: HookContext,
        nextNetworkConnection: NetworkConnection<ChainTypeT>,
      ) => Promise<void>,
    ): Promise<void> {
      if (requestHandlersPerConnection.has(networkConnection) === true) {
        requestHandlersPerConnection.delete(networkConnection);
      }

      return await next(context, networkConnection);
    },
  };

  return handlers;
};
