import type { HardhatEthers } from "../src/types.js";
import type { HardhatRuntimeEnvironment } from "@ignored/hardhat-vnext/types/hre";

import { beforeEach, describe, it } from "node:test";

import { createHardhatRuntimeEnvironment } from "@ignored/hardhat-vnext/hre";

import hardhatEthersPlugin from "../src/index.js";

describe("hardhat-ethers plugin initialization", () => {
  // Check that the plugin is correctly initialized

  let hre: HardhatRuntimeEnvironment;
  let ethers: HardhatEthers;

  beforeEach(async () => {
    hre = await createHardhatRuntimeEnvironment({
      plugins: [hardhatEthersPlugin],
    });

    ({ ethers } = await hre.network.connect());
  });

  it("should correctly set up ethers functionalities", async () => {
    // Test a method from ethers to be sure that it is correctly set up
    ethers.isAddress("0x1234567890123456789012345678901234567890");
  });

  it("should correctly set up the HardhatEthersProvider functionalities", async () => {
    // Test a method from the ethers provider to be sure that it is correctly set up
    await ethers.provider.getBlockNumber();
  });

  it("should correctly set up the HardhatHelpers functionalities", async () => {
    // Test a method from the additional hardhat helpers to be sure that they are correctly set up
    await ethers.getSigners();
  });
});
