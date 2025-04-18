import type { HookContext, NetworkHooks } from "hardhat/types/hooks";
import type { ChainType, NetworkConnection } from "hardhat/types/network";

import { initializeEthers } from "../initialization.js";

export default async (): Promise<Partial<NetworkHooks>> => {
  const handlers: Partial<NetworkHooks> = {
    async newConnection<ChainTypeT extends ChainType | string>(
      context: HookContext,
      next: (context: HookContext) => Promise<NetworkConnection<ChainTypeT>>,
    ) {
      const connection: NetworkConnection<ChainTypeT> = await next(context);

      connection.ethers = await initializeEthers(
        connection.provider,
        connection.networkName,
        connection.networkConfig,
        context.artifacts,
      );

      return connection;
    },
  };

  return handlers;
};
