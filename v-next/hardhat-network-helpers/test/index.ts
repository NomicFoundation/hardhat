import type { NetworkHelpers } from "../src/types.js";
import type { HardhatRuntimeEnvironment } from "@ignored/hardhat-vnext/types/hre";

import { beforeEach, describe, it } from "node:test";

import { createHardhatRuntimeEnvironment } from "@ignored/hardhat-vnext/hre";

import hardhatNetworkHelpersPlugin from "../src/index.js";

describe("hardhat-network-helpers plugin initialization", () => {
  // Check that the plugin is correctly initialized

  let hre: HardhatRuntimeEnvironment;
  let networkHelpers: NetworkHelpers;

  beforeEach(async () => {
    hre = await createHardhatRuntimeEnvironment({
      plugins: [hardhatNetworkHelpersPlugin],
    });

    ({ networkHelpers } = await hre.network.connect());
  });

  describe("network-helpers class and its sub classes", () => {
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
});
