import type { HookContext, NetworkHooks } from "hardhat/types/hooks";
import type { ChainType, NetworkConnection } from "hardhat/types/network";
import type { HardhatPlugin } from "hardhat/types/plugins";
import type { JsonRpcRequest, JsonRpcResponse } from "hardhat/types/providers";

/**
 * A mock plugin that simulates a network that doesn't support eth_accounts.
 */
const mockedNetworkPlugin: HardhatPlugin = {
  id: "mocked-network-plugin",
  hookHandlers: {
    network: async () => ({
      default: async (): Promise<Partial<NetworkHooks>> => ({
        async onRequest<ChainTypeT extends ChainType | string>(
          context: HookContext,
          networkConnection: NetworkConnection<ChainTypeT>,
          jsonRpcRequest: JsonRpcRequest,
          next: (
            nextContext: HookContext,
            nextNetworkConnection: NetworkConnection<ChainTypeT>,
            nextJsonRpcRequest: JsonRpcRequest,
          ) => Promise<JsonRpcResponse>,
        ): Promise<JsonRpcResponse> {
          if (jsonRpcRequest.method === "eth_accounts") {
            return {
              jsonrpc: "2.0",
              id: jsonRpcRequest.id,
              error: {
                code: -32601,
                message: "Method not found",
              },
            };
          }

          return next(context, networkConnection, jsonRpcRequest);
        },
      }),
    }),
  },
};

export default mockedNetworkPlugin;
