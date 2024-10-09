import type {
  JsonRpcRequest,
  JsonRpcResponse,
} from "../../../../types/providers.js";
import type {
  HookContext,
  NetworkHooks,
} from "@ignored/hardhat-vnext/types/hooks";
import type {
  ChainType,
  NetworkConnection,
} from "@ignored/hardhat-vnext/types/network";

import { JsonRpcRequestModifier } from "../json-rpc-request-modifiers/json-rpc-request-modifier.js";

export default async (): Promise<Partial<NetworkHooks>> => {
  // This map is necessary because Hardhat V3 supports multiple networks, requiring us to track them
  // to apply the appropriate modifiers to each request.
  // When a connection is closed, it is removed from the map. Refer to "closeConnection" at the end of the file.
  const jsonRpcRequestModifiers: Map<number, JsonRpcRequestModifier> =
    new Map();

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
      let jsonRpcRequestModifier = jsonRpcRequestModifiers.get(
        networkConnection.id,
      );

      if (jsonRpcRequestModifier === undefined) {
        jsonRpcRequestModifier = new JsonRpcRequestModifier(networkConnection);

        jsonRpcRequestModifiers.set(
          networkConnection.id,
          jsonRpcRequestModifier,
        );
      }

      const newJsonRpcRequest =
        await jsonRpcRequestModifier.createModifiedJsonRpcRequest(
          jsonRpcRequest,
        );

      return next(context, networkConnection, newJsonRpcRequest);
    },

    async closeConnection<ChainTypeT extends ChainType | string>(
      context: HookContext,
      networkConnection: NetworkConnection<ChainTypeT>,
      next: (
        nextContext: HookContext,
        nextNetworkConnection: NetworkConnection<ChainTypeT>,
      ) => Promise<void>,
    ): Promise<void> {
      if (jsonRpcRequestModifiers.has(networkConnection.id) === true) {
        jsonRpcRequestModifiers.delete(networkConnection.id);
      }

      return next(context, networkConnection);
    },
  };

  return handlers;
};
