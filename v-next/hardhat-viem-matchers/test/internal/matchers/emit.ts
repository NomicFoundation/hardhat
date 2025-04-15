import type { HardhatViemMatchers } from "../../../src/types.js";
import type { HardhatViemHelpers } from "@nomicfoundation/hardhat-viem/types";
import type { HardhatRuntimeEnvironment } from "hardhat/types/hre";

import { before, beforeEach, describe, it } from "node:test";

import { useEphemeralFixtureProject } from "@nomicfoundation/hardhat-test-utils";
import hardhatViem from "@nomicfoundation/hardhat-viem";
import { createHardhatRuntimeEnvironment } from "hardhat/hre";

import hardhatViemMatchers from "../../../src/index.js";

describe("balancesHaveChanged", () => {
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

  it("should check that the event was emitted", async () => {
    const contract = await viem.deployContract("Events");

    await viem.assertions.emit(
      contract.write.emitWithoutArgs,
      contract,
      "WithoutArgs",
    );
  });

  it("should check that the event was emitted with the correct single argument", async () => {
    const contract = await viem.deployContract("Events");

    await viem.assertions.emitWithArgs(
      async () => {
        await contract.write.emitInt([1]);
      },
      contract,
      "WithIntArg",
      [1],
    );
  });

  it("should check that the event was emitted with the correct multiple arguments", async () => {
    const contract = await viem.deployContract("Events");

    await viem.assertions.emitWithArgs(
      async () => {
        await contract.write.emitTwoUints([1, 2]);
      },
      contract,
      "WithTwoUintArgs",
      [1, 2],
    );
  });

  // TODO: check that one emit is isolated from the following emit
});
