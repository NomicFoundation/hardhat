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
import { anyValue } from "../../../../src/predicates.js";

describe("revertWithCustomErrorWithArgs", () => {
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

  it("should check that the function reverts with uint", async () => {
    const contract = await viem.deployContract("Revert");

    await viem.assertions.revertWithCustomErrorWithArgs(
      contract.read.revertWithCustomErrorWithInt([1n]),
      contract,
      "CustomErrorWithInt",
      [1n],
    );
  });

  it("should check that the function reverts with array", async () => {
    const contract = await viem.deployContract("Revert");

    await viem.assertions.revertWithCustomErrorWithArgs(
      contract.read.revertWithCustomErrorWithArray([[1, 2, 3]]),
      contract,
      "CustomErrorWithArray",
      [[1n, 2n, 3n]],
    );
  });

  it("should check that the function reverts with struct", async () => {
    const contract = await viem.deployContract("Revert");

    await viem.assertions.revertWithCustomErrorWithArgs(
      contract.read.revertWithCustomErrorWithStruct([{ a: 1, b: 2 }]),
      contract,
      "CustomErrorWithStruct",
      [{ a: 1n, b: 2n }],
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

  it("should check that the function reverts with multiple args with named parameters", async () => {
    const contract = await viem.deployContract("Revert");

    await viem.assertions.revertWithCustomErrorWithArgs(
      contract.read.revertWithCustomErrorWithUintAndStringNamedParam([
        1n,
        2n,
        "test",
      ]),
      contract,
      "CustomErrorWithUintAndStringNamedParam",
      [1n, 2n, "test"],
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
        `The function was expected to revert with "CustomErrorWithInt", but it did not.`,
    );
  });

  describe("using predicates", function () {
    it("supports predicates on all of the arguments", async () => {
      const contract = await viem.deployContract("Revert");

      await viem.assertions.revertWithCustomErrorWithArgs(
        contract.read.revertWithCustomErrorWithUintAndString([1n, "test"]),
        contract,
        "CustomErrorWithUintAndString",
        [anyValue, anyValue],
      );
    });

    it("supports predicates on some of the arguments", async () => {
      const contract = await viem.deployContract("Revert");

      await viem.assertions.revertWithCustomErrorWithArgs(
        contract.read.revertWithCustomErrorWithUintAndString([1n, "test"]),
        contract,
        "CustomErrorWithUintAndString",
        [(arg: bigint) => arg === 1n, "test"],
      );
    });

    it("supports predicates on strings", async () => {
      const contract = await viem.deployContract("Revert");

      await viem.assertions.revertWithCustomErrorWithArgs(
        contract.read.revertWithCustomErrorWithUintAndString([1n, "test"]),
        contract,
        "CustomErrorWithUintAndString",
        [1n, (arg: string) => arg.length === 4],
      );

      await assertRejects(
        viem.assertions.revertWithCustomErrorWithArgs(
          contract.read.revertWithCustomErrorWithUintAndString([1n, "test"]),
          contract,
          "CustomErrorWithUintAndString",
          [1n, (arg: string) => arg.length === 5],
        ),
        (error) =>
          error.message.includes(
            `The error arguments do not match the expected ones`,
          ),
      );
    });

    it("supports predicates on arrays", async () => {
      const contract = await viem.deployContract("Revert");

      await viem.assertions.revertWithCustomErrorWithArgs(
        contract.read.revertWithCustomErrorWithArray([[1, 2, 3]]),
        contract,
        "CustomErrorWithArray",
        [(arg: bigint[]) => arg.length === 3],
      );

      await assertRejects(
        viem.assertions.revertWithCustomErrorWithArgs(
          contract.read.revertWithCustomErrorWithArray([[1, 2, 3]]),
          contract,
          "CustomErrorWithArray",
          [(arg: bigint[]) => arg.length === 4],
        ),
        (error) =>
          error.message.includes(
            `The error arguments do not match the expected ones`,
          ),
      );
    });

    it("supports predicates on structs", async () => {
      const contract = await viem.deployContract("Revert");

      await viem.assertions.revertWithCustomErrorWithArgs(
        contract.read.revertWithCustomErrorWithStruct([{ a: 1, b: 2 }]),
        contract,
        "CustomErrorWithStruct",
        [(arg: { a: bigint; b: bigint }) => arg.a === 1n && arg.b === 2n],
      );

      await assertRejects(
        viem.assertions.revertWithCustomErrorWithArgs(
          contract.read.revertWithCustomErrorWithStruct([{ a: 1, b: 2 }]),
          contract,
          "CustomErrorWithStruct",
          [(arg: { a: bigint; b: bigint }) => arg.a === 1n && arg.b === 3n],
        ),
        (error) =>
          error.message.includes(
            `The error arguments do not match the expected ones`,
          ),
      );
    });

    it("fails when predicate returns false", async () => {
      const contract = await viem.deployContract("Revert");

      await assertRejects(
        viem.assertions.revertWithCustomErrorWithArgs(
          contract.read.revertWithCustomErrorWithUintAndString([1n, "test"]),
          contract,
          "CustomErrorWithUintAndString",
          [(arg: bigint) => arg === 2n, "test"],
        ),
        (error) =>
          [
            "The error arguments do not match the expected ones",
            'Expected: ["<predicate>","test"]',
            'Raised: ["1","test"]',
          ].every((msg) => error.message.includes(msg)),
      );
    });
  });
});
