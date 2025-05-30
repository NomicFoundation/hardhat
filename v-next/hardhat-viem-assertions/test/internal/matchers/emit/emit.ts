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
import { isExpectedError } from "../../../helpers/is-expected-error.js";

describe("emit", () => {
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

  it("should check that the event was emitted", async () => {
    const contract = await viem.deployContract("Events");

    await viem.assertions.emit(
      contract.write.emitWithoutArgs(),
      contract,
      "WithoutArgs",
    );
  });

  it("should throw because the event does not exists in the ABI", async () => {
    const contract = await viem.deployContract("Events");

    await assertRejects(
      viem.assertions.emit(contract.write.doNotEmit(), contract, "NotExists"),
      (error) =>
        isExpectedError(
          error,
          `Event "NotExists" not found in the contract ABI`,
          false,
          true,
        ),
    );
  });

  it("should throw because no event was emitted", async () => {
    const contract = await viem.deployContract("Events");

    await assertRejects(
      viem.assertions.emit(contract.write.doNotEmit(), contract, "WithoutArgs"),
      (error) =>
        isExpectedError(
          error,
          `No events were emitted for contract with address "${contract.address}" and event name "WithoutArgs"`,
          false,
          true,
        ),
    );
  });

  it("should check that the same event is independent from the following event", async () => {
    const contract = await viem.deployContract("Events");

    // It should emit the first event correctly
    await viem.assertions.emit(
      contract.write.emitWithoutArgs(),
      contract,
      "WithoutArgs",
    );

    // It should throw because the event emitted in the previous function should not be related to this one
    await assertRejects(
      viem.assertions.emit(contract.write.doNotEmit(), contract, "WithoutArgs"),
      (error) =>
        isExpectedError(
          error,
          `No events were emitted for contract with address "${contract.address}" and event name "WithoutArgs"`,
          false,
          true,
        ),
    );
  });
});
