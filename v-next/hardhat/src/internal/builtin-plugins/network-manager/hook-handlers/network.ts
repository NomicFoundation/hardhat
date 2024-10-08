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

import { JsonRequestModifier } from "../json-request-modifiers/json-request-modifier.js";

export default async (): Promise<Partial<NetworkHooks>> => {
  const jsonRequestModifiers: Map<number, JsonRequestModifier> = new Map();

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
      let jsonRequestModifier = jsonRequestModifiers.get(networkConnection.id);

      if (jsonRequestModifier === undefined) {
        jsonRequestModifier = new JsonRequestModifier(networkConnection);
        jsonRequestModifiers.set(networkConnection.id, jsonRequestModifier);
      }

      const newJsonRpcRequest =
        await jsonRequestModifier.createModifiedJsonRpcRequest(jsonRpcRequest);

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
      if (jsonRequestModifiers.has(networkConnection.id) === true) {
        jsonRequestModifiers.delete(networkConnection.id);
      }

      return next(context, networkConnection);
    },
  };

  return handlers;
};
