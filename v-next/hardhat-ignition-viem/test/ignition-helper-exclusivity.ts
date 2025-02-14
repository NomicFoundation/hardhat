import type {
  HookContext,
  NetworkHooks,
} from "@ignored/hardhat-vnext/types/hooks";
import type {
  ChainType,
  NetworkConnection,
} from "@ignored/hardhat-vnext/types/network";
import type { HardhatPlugin } from "@ignored/hardhat-vnext/types/plugins";

import path from "node:path";
import { fileURLToPath } from "node:url";

import { createHardhatRuntimeEnvironment } from "@ignored/hardhat-vnext/hre";
import { HardhatError } from "@ignored/hardhat-vnext-errors";
import { assertRejects } from "@nomicfoundation/hardhat-test-utils";
import { assert } from "chai";

import hardhatIgnitionViemPlugin from "../src/index.js";

describe("ignition helper mutual exclusivity", () => {
  let originalCwd: string;

  // A fake version of the hardhat-ignition-ethers plugin that adds
  // a fake ignition helper object to the network connection.
  const fakeHardhatIgnitionEthersPlugin: HardhatPlugin = {
    id: "test:hardhat-ignition-ethers",
    hookHandlers: {
      network: async () => {
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
    },
  };

  before(function () {
    originalCwd = process.cwd();

    process.chdir(
      path.join(
        path.dirname(fileURLToPath(import.meta.url)),
        "./fixture-projects",
        "with-fake-helper",
      ),
    );
  });

  after(function () {
    process.chdir(originalCwd);
  });

  it("should error when loaded in conjunction with hardhat-ignition-ethers", async function () {
    await assertRejects(
      async () => {
        const hre = await createHardhatRuntimeEnvironment({
          plugins: [fakeHardhatIgnitionEthersPlugin, hardhatIgnitionViemPlugin],
        });

        return hre.network.connect();
      },
      (error: Error) => {
        assert.instanceOf(error, HardhatError);
        assert.equal(
          error.number,
          HardhatError.ERRORS.IGNITION
            .ONLY_ONE_IGNITION_EXTENSION_PLUGIN_ALLOWED.number,
        );
        return true;
      },
      "The `hardhat-viem-plugin` did not detect the presence of the `hardhat-ethers-plugin`",
    );
  });
});
