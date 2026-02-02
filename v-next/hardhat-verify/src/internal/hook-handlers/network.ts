import type { HookContext, NetworkHooks } from "hardhat/types/hooks";
import type { ChainType, NetworkConnection } from "hardhat/types/network";

export default async (): Promise<Partial<NetworkHooks>> => ({
  async newConnection<ChainTypeT extends ChainType | string>(
    context: HookContext,
    next: (nextContext: HookContext) => Promise<NetworkConnection<ChainTypeT>>,
  ) {
    const connection = await next(context);

    const { Verifier } = await import("../verifier.js");

    connection.verifier = new Verifier(
      connection.provider,
      connection.networkName,
      context.config.chainDescriptors,
      context.config.verify,
    );

    return connection;
  },
});
