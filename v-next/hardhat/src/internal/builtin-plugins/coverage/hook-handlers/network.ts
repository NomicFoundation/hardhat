import type { NetworkConfigOverride } from "hardhat/types/config";
import type { HookContext, NetworkHooks } from "hardhat/types/hooks";
import type { ChainType, NetworkConnection } from "hardhat/types/network";

import { EdrProvider } from "../../network-manager/edr/edr-provider.js";

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
        if (connection.provider instanceof EdrProvider) {
          const { CoverageManagerImplementation } = await import(
            "../internal/coverage-manager.js"
          );
          const coverageManager = CoverageManagerImplementation.getOrCreate();
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
          const { CoverageManagerImplementation } = await import(
            "../internal/coverage-manager.js"
          );
          const coverageManager = CoverageManagerImplementation.getOrCreate();
          await coverageManager.addProvider(
            connection.id.toString(),
            connection.provider,
          );
        }
      }

      await next(context, connection);
    },
  };

  return handlers;
};
