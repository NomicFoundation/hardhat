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

describe("revertWithCustomError", () => {
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

    await viem.assertions.revertWithCustomError(
      contract.read.revertWithCustomError(),
      contract,
      "CustomError",
    );
  });

  it("should check that the function reverts when called within nested contracts", async () => {
    const contract = await viem.deployContract("RevertWithNestedError");
    const contractThatThrows = await viem.deployContract("Revert");

    await viem.assertions.revertWithCustomError(
      contract.read.nestedCustomRevert(),
      contractThatThrows,
      "CustomError",
    );
  });

  it("should throw because the function revert with a different error", async () => {
    const contract = await viem.deployContract("Revert");

    await assertRejects(
      viem.assertions.revertWithCustomError(
        contract.read.revertWithCustomError(),
        contract,
        "CustomErrorWithInt",
      ),
      (error) =>
        isExpectedError(
          error,
          `The function was expected to revert with custom error "CustomErrorWithInt", but it reverted with custom error "CustomError"`,
          "CustomError",
          "CustomErrorWithInt",
        ),
    );
  });

  it("should throw because the function revert without a reason", async () => {
    const contract = await viem.deployContract("Revert");

    await assertRejects(
      viem.assertions.revertWithCustomError(
        contract.read.alwaysRevertWithNoReason(),
        contract,
        "CustomError",
      ),
      (error) =>
        error.message ===
        `The function was expected to revert with custom error "CustomError", but it reverted without a reason`,
    );
  });

  it("should throw when the expected error is not in the abi", async () => {
    const contract = await viem.deployContract("Revert");

    await assertRejects(
      viem.assertions.revertWithCustomError(
        contract.read.revertWithCustomError(),
        contract,
        "NonExistingCustomError",
      ),
      (error) =>
        error.message ===
        `The given contract doesn't have a custom error named "NonExistingCustomError"`,
    );
  });

  it("should throw because the function does not revert", async () => {
    const contract = await viem.deployContract("Revert");

    await assertRejects(
      viem.assertions.revertWithCustomError(
        contract.read.doNotRevert(),
        contract,
        "CustomError",
      ),
      (error) =>
        error.message ===
        `The function was expected to revert with custom error "CustomError", but it did not revert`,
    );
  });

  it("should handle when the thrown error is not a custom error", async () => {
    const contract = await viem.deployContract("Revert");

    await assertRejects(
      viem.assertions.revertWithCustomError(
        contract.read.alwaysRevert(), // Not a custom error
        contract,
        "CustomError",
      ),
      (error) =>
        error.message ===
        `The function was expected to revert with custom error "CustomError", but it reverted with reason "Intentional revert for testing purposes"`,
    );
  });

  it("should handle when the thrown error is a panic (overflow) rather than a custom one", async () => {
    const contract = await viem.deployContract("Counter");

    await contract.write.incBy([200]);

    await assertRejects(
      viem.assertions.revertWithCustomError(
        contract.write.incBy([200]), // Overflow - cause panic error
        contract,
        "CustomError",
      ),
      (error) =>
        error.message ===
        `The function was expected to revert with custom error "CustomError", but it reverted with panic code 0x11 (Arithmetic operation overflowed outside of an unchecked block)`,
    );
  });

  it("should handle when the thrown error is a panic (divide by 0) rather than a custom one", async () => {
    const contract = await viem.deployContract("Counter");

    await assertRejects(
      viem.assertions.revertWithCustomError(
        contract.write.divideBy([0]), // Division by 0 - cause panic error
        contract,
        "CustomError",
      ),
      (error) =>
        error.message ===
        `The function was expected to revert with custom error "CustomError", but it reverted with panic code 0x12 (Division or modulo division by zero)`,
    );
  });

  it("should handle when the thrown error is a panic rather than a custom one within nested contracts", async () => {
    const contract = await viem.deployContract("CounterNestedPanicError");

    await contract.write.incBy([200]);

    await assertRejects(
      viem.assertions.revertWithCustomError(
        contract.write.nestedRevert([200]), // Overflow - cause panic error
        contract,
        "CustomError",
      ),
      (error) =>
        error.message ===
        `The function was expected to revert with custom error "CustomError", but it reverted with panic code 0x11 (Arithmetic operation overflowed outside of an unchecked block)`,
    );
  });
});
