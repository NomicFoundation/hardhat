import type { NetworkConfigOverride } from "../../../../types/config.js";
import type {
  ChainType,
  NetworkConnection,
} from "../../../../types/network.js";
import type {
  JsonRpcRequest,
  JsonRpcResponse,
} from "../../../../types/providers.js";

import "../../../../types/hooks.js";
declare module "../../../../types/hooks.js" {
  export interface HardhatHooks {
    network: NetworkHooks;
  }

  export interface NetworkHooks {
    newConnection<ChainTypeT extends ChainType | string>(
      context: HookContext,
      networkName: string | undefined,
      chainType: ChainTypeT | undefined,
      networkConfigOverride: NetworkConfigOverride | undefined,
      next: (
        nextContext: HookContext,
        nextNetworkName: string | undefined,
        nextChainType: ChainTypeT | undefined,
        nextNetworkConfigOverride: NetworkConfigOverride | undefined,
      ) => Promise<NetworkConnection<ChainTypeT>>,
    ): Promise<NetworkConnection<ChainTypeT>>;

    closeConnection<ChainTypeT extends ChainType | string>(
      context: HookContext,
      networkConnection: NetworkConnection<ChainTypeT>,
      next: (
        nextContext: HookContext,
        nextNetworkConnection: NetworkConnection<ChainTypeT>,
      ) => Promise<void>,
    ): Promise<void>;

    onRequest<ChainTypeT extends ChainType | string>(
      context: HookContext,
      networkConnection: NetworkConnection<ChainTypeT>,
      jsonRpcRequest: JsonRpcRequest,
      next: (
        nextContext: HookContext,
        nextNetworkConnection: NetworkConnection<ChainTypeT>,
        nextJsonRpcRequest: JsonRpcRequest,
      ) => Promise<JsonRpcResponse>,
    ): Promise<JsonRpcResponse>;
  }
}
