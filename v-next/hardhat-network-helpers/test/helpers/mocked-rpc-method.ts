import type {
  HookContext,
  NetworkHooks,
} from "@ignored/hardhat-vnext/types/hooks";
import type {
  ChainType,
  NetworkConnection,
} from "@ignored/hardhat-vnext/types/network";
import type {
  JsonRpcRequest,
  JsonRpcResponse,
} from "@ignored/hardhat-vnext/types/providers";

// This network hook handler will returned a mocked value when the method "web3_clientVersion" is called.
// This will simulate a non-test network.
export default async (): Promise<Partial<NetworkHooks>> => {
  const handlers: Partial<NetworkHooks> = {
    onRequest: async <ChainTypeT extends ChainType | string>(
      context: HookContext,
      networkConnection: NetworkConnection<ChainTypeT>,
      jsonRpcRequest: JsonRpcRequest,
      next: (
        nextContext: HookContext,
        nextNetworkConnection: NetworkConnection<ChainTypeT>,
        nextJsonRpcRequest: JsonRpcRequest,
      ) => Promise<JsonRpcResponse>,
    ) => {
      if (jsonRpcRequest.method === "web3_clientVersion") {
        return {
          jsonrpc: "2.0",
          id: jsonRpcRequest.id,
          result: "non-test-network",
        };
      }

      return next(context, networkConnection, jsonRpcRequest);
    },
  };

  return handlers;
};
