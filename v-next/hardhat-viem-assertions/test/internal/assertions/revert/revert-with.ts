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
import { isExpectedError } from "../../../helpers/is-expected-error.js";

describe("revertWith", () => {
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

    await viem.assertions.revertWith(
      contract.read.alwaysRevert(),
      "Intentional revert for testing purposes",
    );
  });

  it("should check that the function reverts when called within nested contracts", async () => {
    const contract = await viem.deployContract("RevertWithNestedError");

    await viem.assertions.revertWith(
      contract.read.nestedRevert(),
      "Intentional revert for testing purposes",
    );
  });

  it("should throw because the function reverts with a different reason", async () => {
    const contract = await viem.deployContract("Revert");

    await assertRejects(
      viem.assertions.revertWith(contract.read.alwaysRevert(), "wrong reasons"),
      (error) =>
        isExpectedError(
          error,
          `The function was expected to revert with reason "wrong reasons", but it reverted with reason "Intentional revert for testing purposes".`,
          "Intentional revert for testing purposes",
          "wrong reasons",
        ),
    );
  });

  it("should throw because the function does not revert", async () => {
    const contract = await viem.deployContract("Revert");

    await assertRejects(
      viem.assertions.revertWith(
        contract.read.doNotRevert(),
        "Intentional revert for testing purposes",
      ),
      (error) =>
        error.message ===
        "The function was expected to revert, but it did not.",
    );
  });

  it("should check that the function reverts with a panic error", async function () {
    const counter = await viem.deployContract("Counter");

    await viem.assertions.revertWith(
      counter.write.incBy([2000]), // Overflow - cause panic error
      `Number "2000" is not in safe 8-bit unsigned integer range (0 to 255)`,
    );
  });

  it("should check that the function reverts with a panic error when called within nested contracts", async () => {
    const contract = await viem.deployContract("CounterNestedPanicError");

    await viem.assertions.revertWith(
      contract.write.nestedRevert([2000]), // Overflow - cause panic error
      `Number "2000" is not in safe 8-bit unsigned integer range (0 to 255)`,
    );
  });
});
