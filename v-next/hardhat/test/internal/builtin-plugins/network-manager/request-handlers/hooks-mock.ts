import type { HardhatUserConfig } from "../../../../../src/config.js";
import type { HookContext } from "../../../../../src/types/hooks.js";
import type { HardhatRuntimeEnvironment } from "../../../../../src/types/hre.js";
import type {
  ChainType,
  NetworkConnection,
} from "../../../../../src/types/network.js";
import type {
  JsonRpcRequest,
  JsonRpcResponse,
} from "../../../../../src/types/providers.js";

import { createHardhatRuntimeEnvironment } from "../../../../../src/hre.js";

// We override the network hook handlers to set two dynamic hook handler
// categories, which will take precedence over the default ones.
//
// This means that they are going to be the first ones to be called, so we
// set the handler that we want to test as the first one, and the mocked
// one as the second one.
//
// In this way, the function "next" in the first handler will call the mock.
export async function createMockedNetworkHre(
  hardhatUserConfig: HardhatUserConfig,
  returnValues: Record<string, any> = {},
): Promise<HardhatRuntimeEnvironment> {
  const mockedResponse: JsonRpcResponse = {
    jsonrpc: "2.0",
    id: 1,
    result: [],
  };

  const hre = await createHardhatRuntimeEnvironment(hardhatUserConfig);

  hre.hooks.registerHandlers("network", {
    onRequest: async <ChainTypeT extends ChainType | string>(
      _context: HookContext,
      _networkConnection: NetworkConnection<ChainTypeT>,
      jsonRpcRequest: JsonRpcRequest,
      _next: (
        nextContext: HookContext,
        nextNetworkConnection: NetworkConnection<ChainTypeT>,
        nextJsonRpcRequest: JsonRpcRequest,
      ) => Promise<JsonRpcResponse>,
    ) => {
      if (returnValues[jsonRpcRequest.method] !== undefined) {
        mockedResponse.result = returnValues[jsonRpcRequest.method];
        return mockedResponse;
      }

      // Returns the modified jsonRpcRequest as a response, so it can be verified in the test that it
      // was successfully modified
      mockedResponse.result = jsonRpcRequest.params;
      return mockedResponse;
    },
  });

  // We set the default network hook handlers again, to take precedence over the
  // mocked one.
  const { default: networkHookHandlerHandlersFactory } = await import(
    "../../../../../src/internal/builtin-plugins/network-manager/hook-handlers/network.js"
  );

  hre.hooks.registerHandlers(
    "network",
    await networkHookHandlerHandlersFactory(),
  );

  return hre;
}
