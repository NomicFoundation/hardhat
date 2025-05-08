import type { HardhatViemHelpers } from "@nomicfoundation/hardhat-viem/types";
import type { HardhatRuntimeEnvironment } from "hardhat/types/hre";

import { before, beforeEach, describe, it } from "node:test";

import {
  assertRejects,
  useEphemeralFixtureProject,
} from "@nomicfoundation/hardhat-test-utils";
import hardhatViem from "@nomicfoundation/hardhat-viem";
import { createHardhatRuntimeEnvironment } from "hardhat/hre";

import hardhatViemMatchers from "../../../../src/index.js";

describe("revertWithCustomError", () => {
  let hre: HardhatRuntimeEnvironment;
  let viem: HardhatViemHelpers;

  useEphemeralFixtureProject("hardhat-project");

  before(async () => {
    hre = await createHardhatRuntimeEnvironment({
      solidity: "0.8.24",
      plugins: [hardhatViem, hardhatViemMatchers],
    });

    await hre.tasks.getTask("compile").run({});
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
        "NonExistingCustomError",
      ),
      (error) =>
        error.message.includes(
          `Expected error name: "NonExistingCustomError", but found "CustomError".`,
        ),
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
        `The function was expected to revert with "CustomError", but it did not.`,
    );
  });
});
