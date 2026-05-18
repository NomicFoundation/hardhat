import type { HookContext, NetworkHooks } from "hardhat/types/hooks";
import type { ChainType, NetworkConnection } from "hardhat/types/network";

import { HardhatViemAssertionsImpl } from "../viem-assertions.js";

export default async (): Promise<Partial<NetworkHooks>> => {
  const handlers: Partial<NetworkHooks> = {
    async newConnection<ChainTypeT extends ChainType | string>(
      context: HookContext,
      next: (
        nextContext: HookContext,
      ) => Promise<NetworkConnection<ChainTypeT>>,
    ) {
      const connection = await next(context);

      connection.viem.assertions = new HardhatViemAssertionsImpl<ChainTypeT>(
        connection.viem,
      );

      return connection;
    },
  };

  return handlers;
};
