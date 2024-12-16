import type { NetworkHelpers } from "../src/types.js";
import type { HardhatRuntimeEnvironment } from "@ignored/hardhat-vnext/types/hre";

import { beforeEach, describe, it } from "node:test";

import { createHardhatRuntimeEnvironment } from "@ignored/hardhat-vnext/hre";
import { HardhatError } from "@ignored/hardhat-vnext-errors";
import { assertRejectsWithHardhatError } from "@nomicfoundation/hardhat-test-utils";

import hardhatNetworkHelpersPlugin from "../src/index.js";

describe("hardhat-network-helpers plugin initialization", () => {
  // Check that the plugin is correctly initialized

  let hre: HardhatRuntimeEnvironment;
  let networkHelpers: NetworkHelpers;

  describe("network-helpers class and its sub classes successfully initialized", () => {
    beforeEach(async () => {
      hre = await createHardhatRuntimeEnvironment({
        plugins: [hardhatNetworkHelpersPlugin],
      });

      ({ networkHelpers } = await hre.network.connect());
    });

    it("should correctly set up the network-helpers class", async () => {
      // Test a method from the network-helpers class to be sure that it is correctly set up
      await networkHelpers.takeSnapshot();
    });

    it("should correctly set up the time class", async () => {
      // Test a method from the time class to be sure that it is correctly set up
      await networkHelpers.time.latest();
    });

    it("should correctly set up the duration class", async () => {
      // Test a method from the duration class to be sure that it is correctly set up
      networkHelpers.time.duration.days(1);
    });
  });

  describe("should throw because not a dev network", async () => {
    beforeEach(async () => {
      hre = await createHardhatRuntimeEnvironment({
        networks: {
          "non-test": {
            type: "http",
            url: "http://localhost:8545",
          },
        },
        plugins: [
          hardhatNetworkHelpersPlugin,
          {
            // This test plugin is used to return a mocked test value for the "web3_clientVersion" method,
            // enabling the simulation of a non-test network.
            id: "mocked-web3-client-version",
            hookHandlers: {
              network: import.meta.resolve(
                "./helpers/mocked-web3-client-version.js",
              ),
            },
          },
        ],
      });

      ({ networkHelpers } = await hre.network.connect("non-test"));
    });

    it("should throw when using a method from the network-helpers class", async () => {
      assertRejectsWithHardhatError(
        () => networkHelpers.takeSnapshot(),
        HardhatError.ERRORS.NETWORK_HELPERS
          .CAN_ONLY_BE_USED_WITH_HARDHAT_NETWORK_VERSIONED,
        {
          networkName: "non-test",
          version: "non-test-network",
        },
      );
    });

    it("should throw when using a method from the time class", async () => {
      assertRejectsWithHardhatError(
        () => networkHelpers.time.latest(),
        HardhatError.ERRORS.NETWORK_HELPERS
          .CAN_ONLY_BE_USED_WITH_HARDHAT_NETWORK_VERSIONED,
        {
          networkName: "non-test",
          version: "non-test-network",
        },
      );
    });
  });
});
