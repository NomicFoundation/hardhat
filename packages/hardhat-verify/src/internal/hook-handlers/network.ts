import type { HookContext, NetworkHooks } from "hardhat/types/hooks";
import type { ChainType, NetworkConnection } from "hardhat/types/network";

import { LazyVerification } from "../lazy-verification.js";

export default async (): Promise<Partial<NetworkHooks>> => ({
  async newConnection<ChainTypeT extends ChainType | string>(
    context: HookContext,
    next: (nextContext: HookContext) => Promise<NetworkConnection<ChainTypeT>>,
  ) {
    const connection = await next(context);

    connection.verification = new LazyVerification(
      connection.provider,
      connection.networkName,
      context.config.chainDescriptors,
      context.config.verify,
    );

    return connection;
  },
});
