import type { NetworkConfigOverride } from "hardhat/types/config";
import type { HookContext, NetworkHooks } from "hardhat/types/hooks";
import type { ChainType, NetworkConnection } from "hardhat/types/network";

import { initializeEthers } from "../initialization.js";

export default async (): Promise<Partial<NetworkHooks>> => {
  const handlers: Partial<NetworkHooks> = {
    async newConnection<ChainTypeT extends ChainType | string>(
      context: HookContext,
      networkName: string | undefined,
      chainType: ChainTypeT | undefined,
      networkConfigOverride: NetworkConfigOverride | undefined,
      next: (
        context: HookContext,
        networkName: string | undefined,
        chainType: ChainTypeT | undefined,
        networkConfigOverride: NetworkConfigOverride | undefined,
      ) => Promise<NetworkConnection<ChainTypeT>>,
    ) {
      const connection: NetworkConnection<ChainTypeT> = await next(
        context,
        networkName,
        chainType,
        networkConfigOverride
      );

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
