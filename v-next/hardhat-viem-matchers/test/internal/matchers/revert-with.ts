import type { HardhatViemMatchers } from "../../../src/types.js";
import type { HardhatViemHelpers } from "@nomicfoundation/hardhat-viem/types";
import type { HardhatRuntimeEnvironment } from "hardhat/types/hre";

import { before, beforeEach, describe, it } from "node:test";

import {
  assertRejects,
  useEphemeralFixtureProject,
} from "@nomicfoundation/hardhat-test-utils";
import hardhatViem from "@nomicfoundation/hardhat-viem";
import { createHardhatRuntimeEnvironment } from "hardhat/hre";

import hardhatViemMatchers from "../../../src/index.js";

describe("revertWith", () => {
  let hre: HardhatRuntimeEnvironment;
  let viem: HardhatViemHelpers & {
    assertions: HardhatViemMatchers;
  };

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

    await viem.assertions.revertWith(
      contract.read.alwaysRevert,
      "Intentional revert for testing purposes",
    );
  });

  it("should throw because the function reverts with a different reason", async () => {
    const contract = await viem.deployContract("Revert");

    await assertRejects(
      viem.assertions.revertWith(contract.read.alwaysRevert, "wrong reasons"),
      (error) =>
        error.message ===
        `The function was expected to revert with reason "wrong reasons", but it reverted with reason "Intentional revert for testing purposes".`,
    );
  });

  it("should throw because the function does not revert", async () => {
    const contract = await viem.deployContract("Revert");

    await assertRejects(
      viem.assertions.revertWith(
        contract.read.doNotRevert,
        "Intentional revert for testing purposes",
      ),
      (error) =>
        error.message ===
        "The function was expected to revert, but it did not.",
    );
  });
});
