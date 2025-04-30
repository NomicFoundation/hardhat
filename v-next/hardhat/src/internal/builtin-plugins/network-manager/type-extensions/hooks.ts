import type {
  ChainType,
  NetworkConnection,
} from "../../../../types/network.js";
import type {
  JsonRpcRequest,
  JsonRpcResponse,
} from "../../../../types/providers.js";
import type { CoverageData } from "../../coverage/types.js";

import "../../../../types/hooks.js";
declare module "../../../../types/hooks.js" {
  export interface HardhatHooks {
    network: NetworkHooks;
  }

  export interface NetworkHooks {
    newConnection<ChainTypeT extends ChainType | string>(
      context: HookContext,
      next: (
        nextContext: HookContext,
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

    onCoverageData(
      context: HookContext,
      coverageData: CoverageData,
    ): Promise<void>;
  }
}
