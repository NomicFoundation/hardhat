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

describe("revertWithCustomErrorWithArgs", () => {
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

    await viem.assertions.revertWithCustomErrorWithArgs(
      contract.read.revertWithCustomErrorWithInt([1n]),
      contract,
      "CustomErrorWithInt",
      [1n],
    );
  });

  it("should check that the function reverts with multiple args", async () => {
    const contract = await viem.deployContract("Revert");

    await viem.assertions.revertWithCustomErrorWithArgs(
      contract.read.revertWithCustomErrorWithUintAndString([1n, "test"]),
      contract,
      "CustomErrorWithUintAndString",
      [1n, "test"],
    );
  });

  it("should check that the function reverts when called within nested contracts", async () => {
    const contract = await viem.deployContract("Revert");
    const contractThatThrows = await viem.deployContract("Revert");

    await viem.assertions.revertWithCustomErrorWithArgs(
      contract.read.revertWithCustomErrorWithInt([1n]),
      contractThatThrows,
      "CustomErrorWithInt",
      [1n],
    );
  });

  it("should throw because the function does not revert", async () => {
    const contract = await viem.deployContract("Revert");

    await assertRejects(
      viem.assertions.revertWithCustomErrorWithArgs(
        contract.read.doNotRevert(),
        contract,
        "CustomErrorWithInt",
        [1n],
      ),
      (error) =>
        error.message ===
        "The function was expected to revert, but it did not.",
    );
  });
});
