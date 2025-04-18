import type { NetworkConfigOverride } from "hardhat/types/config";
import type { HookContext, NetworkHooks } from "hardhat/types/hooks";
import type { ChainType, NetworkConnection } from "hardhat/types/network";

import { CoverageManagerImplementation } from "../coverage-manager.js";

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
      // TODO: Register for callbacks either with the EDR provider or the network
      // manager if EDR exposes callback push API

      const connection = await next(
        context,
        networkName,
        chainType,
        networkConfigOverride,
      );

      const coverageManager = await CoverageManagerImplementation.getOrCreate();
      await coverageManager.handleNewConnection(connection);

      return connection;
    },
    async closeConnection<ChainTypeT extends ChainType | string>(
      context: HookContext,
      connection: NetworkConnection<ChainTypeT>,
      next: (
        context: HookContext,
        connection: NetworkConnection<ChainTypeT>,
      ) => Promise<void>,
    ) {
      const coverageManager = await CoverageManagerImplementation.getOrCreate();
      await coverageManager.handleCloseConnection(connection);

      await next(context, connection);
    },
  };

  return handlers;
};
