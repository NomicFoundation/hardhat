import type { HookContext, NetworkHooks } from "hardhat/types/hooks";
import type { ChainType, NetworkConnection } from "hardhat/types/network";

import { initializeViemMatchers2 } from "../viem-matchers-initialization-2.js";
import { initializeViemMatchers } from "../viem-matchers-initialization.js";

export default async (): Promise<Partial<NetworkHooks>> => {
  const handlers: Partial<NetworkHooks> = {
    async newConnection<ChainTypeT extends ChainType | string>(
      context: HookContext,
      next: (
        nextContext: HookContext,
      ) => Promise<NetworkConnection<ChainTypeT>>,
    ) {
      const connection: NetworkConnection<ChainTypeT> = await next(context);

      connection.viem.assertions = await initializeViemMatchers(
        connection.viem,
      );

      connection.viem.assertions2 = await initializeViemMatchers2(
        connection.viem,
      );

      connection.viemMatchers = await initializeViemMatchers(connection.viem);

      return connection;
    },
  };

  return handlers;
};
