import type { HookContext, NetworkHooks } from "hardhat/types/hooks";
import type { ChainType, NetworkConnection } from "hardhat/types/network";

import { Verification } from "../verification-helpers.js";

export default async (): Promise<Partial<NetworkHooks>> => ({
  async newConnection<ChainTypeT extends ChainType | string>(
    context: HookContext,
    next: (nextContext: HookContext) => Promise<NetworkConnection<ChainTypeT>>,
  ) {
    const connection = await next(context);

    connection.verification = new Verification(
      connection.provider,
      connection.networkName,
      context.config.chainDescriptors,
      context.config.verify,
    );

    return connection;
  },
});
