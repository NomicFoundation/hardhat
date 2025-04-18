import type { InternalCoverageManager } from "../types.js";
import type { NetworkConfigOverride } from "hardhat/types/config";
import type { HookContext, NetworkHooks } from "hardhat/types/hooks";
import type { ChainType, NetworkConnection } from "hardhat/types/network";

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
      if (context.globalOptions.coverage === true) {
        // TODO: Enable coverage if network config override exposes a coverage toggle
      }

      const connection = await next(
        context,
        networkName,
        chainType,
        networkConfigOverride,
      );

      if (context.globalOptions.coverage === true) {
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- We need to access internal coverage manager methods
        const coverageManager = context.coverage as InternalCoverageManager;
        await coverageManager.handleNewConnection(connection);
      }

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
      if (context.globalOptions.coverage === true) {
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- We need to access internal coverage manager methods
        const coverageManager = context.coverage as InternalCoverageManager;
        await coverageManager.handleCloseConnection(connection);
      }

      await next(context, connection);
    },
  };

  return handlers;
};
