import type { HookContext, NetworkHooks } from "hardhat/types/hooks";
import type { ChainType, NetworkConnection } from "hardhat/types/network";

let initPromise: Promise<void> | undefined;

export default async (): Promise<Partial<NetworkHooks>> => {
  const handlers: Partial<NetworkHooks> = {
    async newConnection<ChainTypeT extends ChainType | string>(
      context: HookContext,
      next: (context: HookContext) => Promise<NetworkConnection<ChainTypeT>>,
    ) {
      // Cache the init promise so concurrent callers share one registration
      // and all await it before a connection is returned.
      if (initPromise === undefined) {
        initPromise = (async () => {
          const { addChaiMatchers } = await import("../add-chai-matchers.js");
          addChaiMatchers();
        })();
      }

      await initPromise;

      return await next(context);
    },
  };

  return handlers;
};
