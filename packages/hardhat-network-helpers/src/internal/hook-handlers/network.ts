import type { HookContext, NetworkHooks } from "hardhat/types/hooks";
import type { ChainType, NetworkConnection } from "hardhat/types/network";

import { LazyNetworkHelpers } from "../network-helpers/lazy-network-helpers.js";

export default async (): Promise<Partial<NetworkHooks>> => {
  const handlers: Partial<NetworkHooks> = {
    async newConnection<ChainTypeT extends ChainType | string>(
      context: HookContext,
      next: (
        nextContext: HookContext,
      ) => Promise<NetworkConnection<ChainTypeT>>,
    ) {
      const connection = await next(context);

      connection.networkHelpers = new LazyNetworkHelpers(connection);

      return connection;
    },
  };

  return handlers;
};
