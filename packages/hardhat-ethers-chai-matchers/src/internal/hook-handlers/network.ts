import type { HookContext, NetworkHooks } from "hardhat/types/hooks";
import type { ChainType, NetworkConnection } from "hardhat/types/network";

let isInitialized = false;

export default async (): Promise<Partial<NetworkHooks>> => {
  const handlers: Partial<NetworkHooks> = {
    async newConnection<ChainTypeT extends ChainType | string>(
      context: HookContext,
      next: (context: HookContext) => Promise<NetworkConnection<ChainTypeT>>,
    ) {
      if (!isInitialized) {
        const { addChaiMatchers } = await import("../add-chai-matchers.js");
        addChaiMatchers();
        isInitialized = true;
      }

      return await next(context);
    },
  };

  return handlers;
};
