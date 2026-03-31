import type { HookContext, NetworkHooks } from "hardhat/types/hooks";
import type { ChainType, NetworkConnection } from "hardhat/types/network";
import type { HardhatPlugin } from "hardhat/types/plugins";

import { describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertRejectsWithHardhatError } from "@nomicfoundation/hardhat-test-utils";
import { createHardhatRuntimeEnvironment } from "hardhat/hre";

import hardhatIgnitionViemPlugin from "../src/index.js";

describe("ignition helper mutual exclusivity", () => {
  // A fake version of the hardhat-ignition-ethers plugin that adds
  // a fake ignition helper object to the network connection.
  const fakeHardhatIgnitionEthersPlugin: HardhatPlugin = {
    id: "test:hardhat-ignition-ethers",
    hookHandlers: {
      network: async () => ({
        default: async () => {
          const handlers: Partial<NetworkHooks> = {
            async newConnection<ChainTypeT extends ChainType | string>(
              context: HookContext,
              next: (
                nextContext: HookContext,
              ) => Promise<NetworkConnection<ChainTypeT>>,
            ) {
              const connection: NetworkConnection<ChainTypeT> =
                await next(context);

              // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- we are using a fake intentionally for the test
              connection.ignition = {
                type: "test-fake-of-ignition-ethers",
              } as any;

              return connection;
            },
          };

          return handlers;
        },
      }),
    },
  };

  it("should error when loaded in conjunction with hardhat-ignition-ethers", async function () {
    await assertRejectsWithHardhatError(
      async () => {
        const hre = await createHardhatRuntimeEnvironment({
          plugins: [fakeHardhatIgnitionEthersPlugin, hardhatIgnitionViemPlugin],
        });

        return hre.network.connect();
      },
      HardhatError.ERRORS.IGNITION.INTERNAL
        .ONLY_ONE_IGNITION_EXTENSION_PLUGIN_ALLOWED,
      {},
    );
  });
});
