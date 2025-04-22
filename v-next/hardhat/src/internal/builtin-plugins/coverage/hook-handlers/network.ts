import type { HookContext, NetworkHooks } from "hardhat/types/hooks";
import type { ChainType, NetworkConnection } from "hardhat/types/network";

import { EdrProvider } from "../../network-manager/edr/edr-provider.js";

export default async (): Promise<Partial<NetworkHooks>> => {
  const handlers: Partial<NetworkHooks> = {
    async newConnection<ChainTypeT extends ChainType | string>(
      context: HookContext,
      next: (
        nextContext: HookContext,
      ) => Promise<NetworkConnection<ChainTypeT>>,
    ) {
      const connection = await next(context);

      if (context.globalOptions.coverage === true) {
        if (connection.provider instanceof EdrProvider) {
          const { getOrCreateInternalCoverageManager } = await import(
            "../internal/coverage-manager.js"
          );
          const coverageManager = getOrCreateInternalCoverageManager();
          await coverageManager.addProvider(
            connection.id.toString(),
            connection.provider,
          );
        }
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
        if (connection.provider instanceof EdrProvider) {
          const { getOrCreateInternalCoverageManager } = await import(
            "../internal/coverage-manager.js"
          );
          const coverageManager = getOrCreateInternalCoverageManager();
          await coverageManager.removeProvider(connection.id.toString());
        }
      }

      await next(context, connection);
    },
  };

  return handlers;
};
