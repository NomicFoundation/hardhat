import type { NetworkConfigOverride } from "hardhat/types/config";
import type { HookContext, NetworkHooks } from "hardhat/types/hooks";
import type { ChainType, NetworkConnection } from "hardhat/types/network";
import type { HardhatPlugin } from "hardhat/types/plugins";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertRejectsWithHardhatError } from "@nomicfoundation/hardhat-test-utils";
import { createHardhatRuntimeEnvironment } from "hardhat/hre";

import hardhatIgnitionEthersPlugin from "../src/index.js";

describe("ignition helper mutual exclusivity", () => {
  // A fake version of the hardhat-ignition-ethers plugin that adds
  // a fake ignition helper object to the network connection.
  const fakeHardhatIgnitionViemPlugin: HardhatPlugin = {
    id: "test:hardhat-ignition-viem",
    hookHandlers: {
      network: async () => {
        const handlers: Partial<NetworkHooks> = {
          async newConnection<ChainTypeT extends ChainType | string>(
            context: HookContext,
            networkName: string | undefined,
            chainType: ChainTypeT | undefined,
            networkConfigOverride: NetworkConfigOverride | undefined,
            next: (
              context: HookContext,
              networkName: string | undefined,
              chainType: ChainTypeT | undefined,
              networkConfigOverride: NetworkConfigOverride | undefined,
            ) => Promise<NetworkConnection<ChainTypeT>>,
          ) {
            const connection: NetworkConnection<ChainTypeT> = await next(
              context,
              networkName,
              chainType,
              networkConfigOverride,
            );

            // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- we are using a fake intentionally for the test
            connection.ignition = {
              type: "test-fake-of-ignition-viem",
            } as any;

            return connection;
          },
        };

        return handlers;
      },
    },
  };

  it("should error when loaded in conjunction with hardhat-ignition-viem", async function () {
    await assertRejectsWithHardhatError(
      async () => {
        const hre = await createHardhatRuntimeEnvironment({
          plugins: [fakeHardhatIgnitionViemPlugin, hardhatIgnitionEthersPlugin],
        });

        return hre.network.connect();
      },
      HardhatError.ERRORS.IGNITION.INTERNAL
        .ONLY_ONE_IGNITION_EXTENSION_PLUGIN_ALLOWED,
      {},
    );
  });
});
