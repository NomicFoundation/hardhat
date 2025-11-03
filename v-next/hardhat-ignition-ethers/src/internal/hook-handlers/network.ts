import type { HookContext, NetworkHooks } from "hardhat/types/hooks";
import type { ChainType, NetworkConnection } from "hardhat/types/network";

import { HardhatError } from "@nomicfoundation/hardhat-errors";

import { EthersIgnitionHelperImpl } from "../ethers-ignition-helper.js";

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

      connection.ignition = new EthersIgnitionHelperImpl(
        context.config,
        context.artifacts,
        connection,
        context.config.ignition,
      );

      return connection;
    },
  };

  return handlers;
};
