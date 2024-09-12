import { HardhatPlugin } from "@ignored/hardhat-vnext/types/plugins";
import { ChainType } from "@ignored/hardhat-vnext/types/config";
import { HookContext } from "@ignored/hardhat-vnext/types/hooks";

import type { NetworkConnection } from "@ignored/hardhat-vnext/types/network";

import "@ignored/hardhat-vnext/types/network";

import type {
  Client,
  CustomTransport,
  PublicActions,
  PublicClient,
  PublicRpcSchema,
} from "viem";

import type { PublicActionsL2 } from "viem/op-stack";

export type ViemPublicClient<ChainTypeT extends ChainType | string> =
  ChainTypeT extends "optimism"
    ? Client<
        CustomTransport,
        undefined,
        undefined,
        PublicRpcSchema,
        PublicActions<CustomTransport, undefined> &
          PublicActionsL2<undefined, undefined>
      >
    : PublicClient;

declare module "@ignored/hardhat-vnext/types/network" {
  export interface NetworkConnection<ChainTypeT extends ChainType | string> {
    viem: {
      client: ViemPublicClient<ChainTypeT>;
    };
  }
}

export const viemScketchPlugin: HardhatPlugin = {
  id: "viem-scketch",
  hookHandlers: {
    network: async () => ({
      async newConnection<ChainTypeT extends ChainType | string>(
        context: HookContext,
        next: (
          nextContext: HookContext,
        ) => Promise<NetworkConnection<ChainTypeT>>,
      ) {
        const { createPublicClient, custom } = await import("viem");
        const { publicActionsL2 } = await import("viem/op-stack");
        const connection: NetworkConnection<ChainTypeT> = await next(context);

        const transport = custom(connection.provider);

        const client =
          connection.chainType === "optimism"
            ? createPublicClient({
                transport: custom(connection.provider),
              }).extend(publicActionsL2())
            : createPublicClient({
                transport,
              });

        connection.viem = { client: client as ViemPublicClient<ChainTypeT> };

        return connection;
      },
    }),
  },
};
