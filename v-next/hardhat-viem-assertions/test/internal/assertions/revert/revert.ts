import type { HardhatViemHelpers } from "@nomicfoundation/hardhat-viem/types";
import type { HardhatRuntimeEnvironment } from "hardhat/types/hre";

import { before, beforeEach, describe, it } from "node:test";

import {
  assertRejects,
  useEphemeralFixtureProject,
} from "@nomicfoundation/hardhat-test-utils";
import hardhatViem from "@nomicfoundation/hardhat-viem";
import { createHardhatRuntimeEnvironment } from "hardhat/hre";

import hardhatViemAssertions from "../../../../src/index.js";

describe("revert", () => {
  let hre: HardhatRuntimeEnvironment;
  let viem: HardhatViemHelpers;

  useEphemeralFixtureProject("hardhat-project");

  before(async () => {
    hre = await createHardhatRuntimeEnvironment({
      solidity: "0.8.24",
      plugins: [hardhatViem, hardhatViemAssertions],
    });

    await hre.tasks.getTask("compile").run({});
  });

  beforeEach(async () => {
    ({ viem } = await hre.network.connect());
  });

  it("should check that the function reverts", async () => {
    const contract = await viem.deployContract("Revert");

    await viem.assertions.revert(contract.read.alwaysRevert());
  });

  it("should check that the function reverts when called within nested contracts", async () => {
    const contract = await viem.deployContract("RevertWithNestedError");

    await viem.assertions.revert(contract.read.nestedRevert());
  });

  it("should throw because the function does not revert", async () => {
    const contract = await viem.deployContract("Revert");

    await assertRejects(
      viem.assertions.revert(contract.read.doNotRevert()),
      (error) =>
        error.message ===
        "The function was expected to revert, but it did not.",
    );
  });

  it("should handle when the thrown error is a custom error", async () => {
    const contract = await viem.deployContract("Revert");

    await assertRejects(
      viem.assertions.revert(
        contract.read.revertWithCustomError(), // A custom error
      ),
      (error) =>
        error.message ===
        `Expected non custom error, but got a custom error selector "0x09caebf3" with data "0x09caebf3"`,
    );
  });

  it("should handle when the thrown error is a panic error (overflow)", async function () {
    const contract = await viem.deployContract("Counter");

    await contract.write.incBy([200]);

    await viem.assertions.revert(contract.write.incBy([200])); // Overflow - cause panic error
  });

  it("should handle when the thrown error is a panic error (divide by zero)", async function () {
    const contract = await viem.deployContract("Counter");

    await viem.assertions.revert(contract.write.divideBy([0])); // Division by 0 - cause panic error
  });

  it("should handle when the thrown error is a panic error within nested contracts", async () => {
    const contract = await viem.deployContract("CounterNestedPanicError");

    await contract.write.incBy([200]);

    await viem.assertions.revert(contract.write.nestedRevert([200])); // Overflow - cause panic error
  });
});
