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

    await hre.tasks.getTask("build").run({});
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
          `The function was expected to revert with reason "wrong reasons", but it reverted with reason: Intentional revert for testing purposes`,
          "Intentional revert for testing purposes",
          "wrong reasons",
        ),
    );
  });

  it("should throw because the function reverts without a reason", async () => {
    const contract = await viem.deployContract("Revert");

    await assertRejects(
      viem.assertions.revertWith(
        contract.read.alwaysRevertWithNoReason(),
        "wrong reasons",
      ),
      (error) =>
        error.message ===
        `The function was expected to revert with reason "wrong reasons", but it reverted without a reason`,
    );
  });

  it("should throw because the function reverts with a different reason (it panics)", async () => {
    const contract = await viem.deployContract("Counter");

    await assertRejects(
      viem.assertions.revertWith(contract.write.divideBy([0]), "wrong reasons"),
      (error) =>
        isExpectedError(
          error,
          `The function was expected to revert with reason "wrong reasons", but it reverted with panic code 0x12 (Division or modulo division by zero)`,
          "0x12",
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
        "The function was expected to revert, but it did not revert",
    );
  });

  it("should check that the function reverts with a panic error (overflow)", async function () {
    const contract = await viem.deployContract("Counter");

    await contract.write.incBy([200]);

    await viem.assertions.revertWith(
      contract.write.incBy([200]), // Overflow - cause panic error
      "0x11",
    );
  });

  it("should check that the function reverts with a panic error (divide by zero)", async function () {
    const contract = await viem.deployContract("Counter");

    await viem.assertions.revertWith(
      contract.write.divideBy([0]), // Division by 0 - cause panic error
      "0x12",
    );
  });

  it("should check that the function reverts with a panic error when called within nested contracts", async () => {
    const contract = await viem.deployContract("CounterNestedPanicError");

    await contract.write.incBy([200]);

    await viem.assertions.revertWith(
      contract.write.nestedRevert([200]), // Overflow - cause panic error
      "0x11",
    );
  });
});
