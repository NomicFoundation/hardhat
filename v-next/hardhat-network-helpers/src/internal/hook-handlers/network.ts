import type {
  HookContext,
  NetworkHooks,
} from "@ignored/hardhat-vnext/types/hooks";
import type {
  ChainType,
  NetworkConnection,
} from "@ignored/hardhat-vnext/types/network";

import { NetworkHelpers } from "../network-helpers/network-helpers.js";

export default async (): Promise<Partial<NetworkHooks>> => {
  const handlers: Partial<NetworkHooks> = {
    async newConnection<ChainTypeT extends ChainType | string>(
      context: HookContext,
      next: (
        nextContext: HookContext,
      ) => Promise<NetworkConnection<ChainTypeT>>,
    ) {
      const connection: NetworkConnection<ChainTypeT> = await next(context);

      connection.networkHelpers = new NetworkHelpers(
        connection.provider,
        connection.networkName,
      );

      return connection;
    },
  };

  return handlers;
};
