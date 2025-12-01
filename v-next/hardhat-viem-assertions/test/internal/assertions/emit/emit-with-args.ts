import type { HardhatViemHelpers } from "@nomicfoundation/hardhat-viem/types";
import type { HardhatRuntimeEnvironment } from "hardhat/types/hre";
import type { EthereumProvider } from "hardhat/types/providers";

import { before, beforeEach, describe, it } from "node:test";

import {
  assertRejects,
  useEphemeralFixtureProject,
} from "@nomicfoundation/hardhat-test-utils";
import hardhatViem from "@nomicfoundation/hardhat-viem";
import { createHardhatRuntimeEnvironment } from "hardhat/hre";

import hardhatViemAssertions from "../../../../src/index.js";
import { anyValue } from "../../../../src/internal/predicates.js";
import { isExpectedError } from "../../../helpers/is-expected-error.js";

describe("emitWithArgs", () => {
  let hre: HardhatRuntimeEnvironment;
  let viem: HardhatViemHelpers;
  let provider: EthereumProvider;

  useEphemeralFixtureProject("hardhat-project");

  before(async () => {
    hre = await createHardhatRuntimeEnvironment({
      solidity: "0.8.24",
      plugins: [hardhatViem, hardhatViemAssertions],
    });

    await hre.tasks.getTask("build").run({});
  });

  beforeEach(async () => {
    ({ provider, viem } = await hre.network.connect());
  });

  it("should check that the event was emitted with the correct single argument", async () => {
    const contract = await viem.deployContract("Events");

    await viem.assertions.emitWithArgs(
      contract.write.emitInt([1n]),
      contract,
      "WithIntArg",
      [1n],
    );
  });

  it("should check that the event was emitted with the correct multiple arguments", async () => {
    const contract = await viem.deployContract("Events");

    await viem.assertions.emitWithArgs(
      contract.write.emitTwoUints([1n, 2n]),
      contract,
      "WithTwoUintArgs",
      [1n, 2n],
    );
  });

  it("should check that the event was emitted when multiple events are emitted", async () => {
    const contract = await viem.deployContract("Events");

    // Temporarily disable auto mine to ensure all events are emitted within the same block
    await provider.request({
      method: "evm_setAutomine",
      params: [false],
    });

    await viem.assertions.emitWithArgs(
      (async () => {
        await contract.write.emitWithoutArgs();
        await contract.write.emitTwoUints([1n, 2n]);
        await contract.write.emitTwoUints([3n, 4n]);
        await contract.write.emitTwoUints([5n, 6n]);
        await contract.write.emitWithoutArgs();

        // Mine a block that will contain multiple events
        await provider.request({
          method: "hardhat_mine",
          params: ["0x1"],
        });
      })(),
      contract,
      "WithTwoUintArgs",
      [3n, 4n],
    );

    // Re-enable auto mine
    await provider.request({
      method: "evm_setAutomine",
      params: [true],
    });
  });

  it("should check that the event was emitted with the correct multiple arguments, one with param name, one without", async () => {
    const contract = await viem.deployContract("Events");

    await viem.assertions.emitWithArgs(
      contract.write.emitTwoUintsMixedParamName([1n, 2n]),
      contract,
      "WithTwoUintArgsMixedParamName",
      [1n, 2n],
    );
  });

  it("should check that the event was emitted with the correct multiple arguments that have no name", async () => {
    const contract = await viem.deployContract("Events");

    await viem.assertions.emitWithArgs(
      contract.write.emitTwoUintsNoParamName([1n, 2n]),
      contract,
      "WithTwoUintArgsNoParamName",
      [1n, 2n],
    );
  });

  describe("same events with different args", () => {
    it("should handle same events with one uint as args", async () => {
      const contract = await viem.deployContract("Events");

      await viem.assertions.emitWithArgs(
        contract.write.emitSameEventDifferentArgs1([1n]),
        contract,
        "SameEventDifferentArgs",
        [1n],
      );
    });

    it("should handle same events with two uint and one string as args", async () => {
      const contract = await viem.deployContract("Events");

      await viem.assertions.emitWithArgs(
        contract.write.emitSameEventDifferentArgs3([1n, 2n, "hello"]),
        contract,
        "SameEventDifferentArgs",
        [1n, 2n, "hello"],
      );
    });

    it("should throw because we do not support same events with multiple args", async () => {
      const contract = await viem.deployContract("Events");

      await assertRejects(
        viem.assertions.emitWithArgs(
          contract.write.emitSameEventDifferentArgs2([1n, 2n]),
          contract,
          "SameEventDifferentArgs",
          [1n, 2n],
        ),
        (error) =>
          isExpectedError(
            error,
            `There are multiple events named "SameEventDifferentArgs" that accepts 2 input arguments. This scenario is currently not supported.`,
            false,
            true,
          ),
      );
    });

    it("should throw because the expected args length does not match with the event", async () => {
      const contract = await viem.deployContract("Events");

      await assertRejects(
        viem.assertions.emitWithArgs(
          contract.write.emitSameEventDifferentArgs3([1n, 2n, "hello"]),
          contract,
          "SameEventDifferentArgs",
          [1n, 2n, 3n, 4n],
        ),
        (error) =>
          isExpectedError(
            error,
            `Event "SameEventDifferentArgs" with argument count 4 not found in the contract ABI`,
            false,
            true,
          ),
      );
    });
  });

  it("should not throw if no args are passed and nothing is emitted", async () => {
    const contract = await viem.deployContract("Events");

    await viem.assertions.emitWithArgs(
      contract.write.emitWithoutArgs(),
      contract,
      "WithoutArgs",
      [],
    );
  });

  it("should throw because the event was not emitted with the correct single argument", async () => {
    const contract = await viem.deployContract("Events");

    await assertRejects(
      viem.assertions.emitWithArgs(
        contract.write.emitInt([1n]),
        contract,
        "WithIntArg",
        [2n],
      ),
      (error) =>
        isExpectedError(
          error,
          "The event arguments do not match the expected ones.",
          [1n],
          [2n],
        ),
    );
  });

  it("should throw because the event was not emitted with the correct multiple arguments", async () => {
    const contract = await viem.deployContract("Events");

    await assertRejects(
      viem.assertions.emitWithArgs(
        contract.write.emitTwoUints([1n, 2n]),
        contract,
        "WithTwoUintArgs",
        [2n, "hello"],
      ),
      (error) =>
        isExpectedError(
          error,
          "The event arguments do not match the expected ones.",
          [1n, 2n],
          [2n, "hello"],
        ),
    );
  });

  describe("using predicates", function () {
    it("should allow using a predicate for all the arguments", async () => {
      const contract = await viem.deployContract("Events");

      await viem.assertions.emitWithArgs(
        contract.write.emitTwoUints([1n, 2n]),
        contract,
        "WithTwoUintArgs",
        [anyValue, anyValue],
      );
    });

    it("should print the predicate name if it has one", async () => {
      const contract = await viem.deployContract("Events");

      const isOdd = (x: bigint) => x % 2n === 1n;

      await assertRejects(
        viem.assertions.emitWithArgs(
          contract.write.emitTwoUints([1n, 2n]),
          contract,
          "WithTwoUintArgs",
          [anyValue, isOdd],
        ),
        (error) => error.message.includes(`["<anyValue>","<isOdd>"]`),
      );
    });

    it("should use a placeholder name if the predicate is anonymous", async () => {
      const contract = await viem.deployContract("Events");

      await assertRejects(
        viem.assertions.emitWithArgs(
          contract.write.emitTwoUints([1n, 2n]),
          contract,
          "WithTwoUintArgs",
          [anyValue, (x: bigint) => x % 2n === 1n],
        ),
        (error) => error.message.includes(`["<anyValue>","<predicate>"]`),
      );
    });

    it("should allow using a predicate for some of the arguments", async () => {
      const contract = await viem.deployContract("Events");

      await viem.assertions.emitWithArgs(
        contract.write.emitTwoUints([1n, 2n]),
        contract,
        "WithTwoUintArgs",
        [1n, (arg: bigint) => arg >= 2],
      );

      await viem.assertions.emitWithArgs(
        contract.write.emitTwoUints([1n, 2n]),
        contract,
        "WithTwoUintArgs",
        [anyValue, 2n],
      );
    });

    it("supports predicates on strings", async () => {
      const contract = await viem.deployContract("Events");

      await viem.assertions.emitWithArgs(
        contract.write.emitString(["foo"]),
        contract,
        "WithString",
        [(arg: string) => arg.length === 3],
      );

      await assertRejects(
        viem.assertions.emitWithArgs(
          contract.write.emitString(["foo"]),
          contract,
          "WithString",
          [(arg: string) => arg.length === 4],
        ),
        (error) =>
          error.message.includes(
            "The event arguments do not match the expected ones",
          ),
      );
    });

    it("supports predicates on arrays", async () => {
      const contract = await viem.deployContract("Events");

      await viem.assertions.emitWithArgs(
        contract.write.emitArray([[1, 2, 3]]),
        contract,
        "WithArray",
        [(arg: number[]) => arg.length === 3],
      );

      await assertRejects(
        viem.assertions.emitWithArgs(
          contract.write.emitArray([[1, 2, 3]]),
          contract,
          "WithArray",
          [(arg: number[]) => arg.length === 4],
        ),
        (error) =>
          error.message.includes(
            "The event arguments do not match the expected ones",
          ),
      );
    });

    it("supports predicates on structs", async () => {
      const contract = await viem.deployContract("Events");

      await viem.assertions.emitWithArgs(
        contract.write.emitStruct([{ a: 1, b: 2 }]),
        contract,
        "WithStruct",
        [(arg: any) => arg.a === 1n && arg.b === 2n],
      );

      await assertRejects(
        viem.assertions.emitWithArgs(
          contract.write.emitStruct([{ a: 1, b: 2 }]),
          contract,
          "WithStruct",
          [(arg: any) => arg.a === 1n && arg.b === 3n],
        ),
        (error) =>
          error.message.includes(
            "The event arguments do not match the expected ones",
          ),
      );
    });

    it("fails when predicate returns false", async () => {
      const contract = await viem.deployContract("Events");

      await assertRejects(
        viem.assertions.emitWithArgs(
          contract.write.emitTwoUints([1n, 2n]),
          contract,
          "WithTwoUintArgs",
          [1n, (arg: bigint) => arg < 2],
        ),
        (error) =>
          [
            "The event arguments do not match the expected ones",
            'Expected: ["1","<predicate>"]',
            'Emitted: ["1","2"]',
          ].every((msg) => error.message.includes(msg)),
      );
    });
  });
});
