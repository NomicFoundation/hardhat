import type { HookContext, NetworkHooks } from "hardhat/types/hooks";
import type { ChainType, NetworkConnection } from "hardhat/types/network";

import { addChaiMatchers } from "../add-chai-matchers.js";

let isInitialized = false;

export default async (): Promise<Partial<NetworkHooks>> => {
  const handlers: Partial<NetworkHooks> = {
    async newConnection<ChainTypeT extends ChainType | string>(
      context: HookContext,
      next: (context: HookContext) => Promise<NetworkConnection<ChainTypeT>>,
    ) {
      if (!isInitialized) {
        addChaiMatchers();
        isInitialized = true;
      }

      return next(context);
    },
  };

  return handlers;
};
