import type { HookContext, NetworkHooks } from "hardhat/types/hooks";
import type { ChainType, NetworkConnection } from "hardhat/types/network";

import { HardhatError } from "@nomicfoundation/hardhat-errors";

import { ViemIgnitionHelperImpl } from "../viem-ignition-helper.js";

export default async (): Promise<Partial<NetworkHooks>> => {
  const handlers: Partial<NetworkHooks> = {
    async newConnection<ChainTypeT extends ChainType | string>(
      context: HookContext,
      next: (
        nextContext: HookContext,
      ) => Promise<NetworkConnection<ChainTypeT>>,
    ) {
      const connection: NetworkConnection<ChainTypeT> = await next(context);

      if (connection.ignition !== undefined) {
        throw new HardhatError(
          HardhatError.ERRORS.IGNITION.INTERNAL.ONLY_ONE_IGNITION_EXTENSION_PLUGIN_ALLOWED,
        );
      }

      connection.ignition = new ViemIgnitionHelperImpl(
        context.config,
        context.artifacts,
        connection,
        context.interruptions,
        context.hooks,
        context.config.ignition,
      );

      return connection;
    },
  };

  return handlers;
};
