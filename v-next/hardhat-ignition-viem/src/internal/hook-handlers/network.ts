import type { NetworkConfigOverride } from "hardhat/types/config";
import type { HookContext, NetworkHooks } from "hardhat/types/hooks";
import type { ChainType, NetworkConnection } from "hardhat/types/network";

import { HardhatError } from "@nomicfoundation/hardhat-errors";

import { ViemIgnitionHelperImpl } from "../viem-ignition-helper.js";

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
        networkConfigOverride,
      );

      if (connection.ignition !== undefined) {
        throw new HardhatError(
          HardhatError.ERRORS.IGNITION.INTERNAL.ONLY_ONE_IGNITION_EXTENSION_PLUGIN_ALLOWED,
        );
      }

      connection.ignition = new ViemIgnitionHelperImpl(
        context.config,
        context.artifacts,
        connection,
      );

      return connection;
    },
  };

  return handlers;
};
