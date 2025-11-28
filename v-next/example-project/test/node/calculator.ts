import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import hre from "hardhat";
import { ContractReturnType } from "@nomicfoundation/hardhat-viem/types";

const { viem } = await hre.network.connect();

// This test suite is used to generate gas usage data for the Calculator contract
describe("Calculator", () => {
  let calculator: ContractReturnType<"Calculator">;

  before(async () => {
    calculator = await viem.deployContract("Calculator");
  });

  it("should start with result = 0", async () => {
    const result = await calculator.read.result();
    assert.equal(result, 0n);
  });

  describe("multiply", () => {
    it("should multiply with varying two-parameter combinations", async () => {
      await calculator.write.multiply([2n, 3n]);
      assert.equal(await calculator.read.result(), 6n);

      await calculator.write.multiply([10n, 5n]);
      assert.equal(await calculator.read.result(), 50n);

      await calculator.write.multiply([100n, 2n]);
      assert.equal(await calculator.read.result(), 200n);

      await calculator.write.multiply([7n, 11n]);
      assert.equal(await calculator.read.result(), 77n);

      await calculator.write.multiply([0n, 999n]);
      assert.equal(await calculator.read.result(), 0n);
    });

    it("should multiply with varying three-parameter combinations", async () => {
      await calculator.write.multiply([2n, 3n, 4n]);
      assert.equal(await calculator.read.result(), 24n);

      await calculator.write.multiply([1n, 1n, 100n]);
      assert.equal(await calculator.read.result(), 100n);

      await calculator.write.multiply([5n, 6n, 7n]);
      assert.equal(await calculator.read.result(), 210n);

      await calculator.write.multiply([10n, 10n, 10n]);
      assert.equal(await calculator.read.result(), 1000n);
    });
  });

  describe("divide", () => {
    it("should divide with various combinations", async () => {
      await calculator.write.divide([20n, 4n]);
      assert.equal(await calculator.read.result(), 5n);

      await calculator.write.divide([100n, 10n]);
      assert.equal(await calculator.read.result(), 10n);

      await calculator.write.divide([49n, 7n]);
      assert.equal(await calculator.read.result(), 7n);

      await calculator.write.divide([1000n, 25n]);
      assert.equal(await calculator.read.result(), 40n);

      await calculator.write.divide([1n, 1n]);
      assert.equal(await calculator.read.result(), 1n);

      await calculator.write.divide([99n, 3n]);
      assert.equal(await calculator.read.result(), 33n);
    });

    it("should revert when dividing by zero", async () => {
      await viem.assertions.revertWith(
        calculator.write.divide([10n, 0n]),
        "Cannot divide by zero",
      );

      await viem.assertions.revertWith(
        calculator.write.divide([999n, 0n]),
        "Cannot divide by zero",
      );
    });
  });

  describe("subtract", () => {
    it("should subtract with various combinations", async () => {
      await calculator.write.subtract([10n, 3n]);
      assert.equal(await calculator.read.result(), 7n);

      await calculator.write.subtract([100n, 25n]);
      assert.equal(await calculator.read.result(), 75n);

      await calculator.write.subtract([50n, 50n]);
      assert.equal(await calculator.read.result(), 0n);

      await calculator.write.subtract([1000n, 1n]);
      assert.equal(await calculator.read.result(), 999n);

      await calculator.write.subtract([77n, 7n]);
      assert.equal(await calculator.read.result(), 70n);
    });

    it("should revert when result would be negative", async () => {
      await viem.assertions.revertWith(
        calculator.write.subtract([3n, 10n]),
        "Result would be negative",
      );

      await viem.assertions.revertWith(
        calculator.write.subtract([1n, 100n]),
        "Result would be negative",
      );

      await viem.assertions.revertWith(
        calculator.write.subtract([0n, 1n]),
        "Result would be negative",
      );
    });
  });

  it("should reset result to zero", async () => {
    await calculator.write.multiply([5n, 5n]);
    await calculator.write.reset();
    assert.equal(await calculator.read.result(), 0n);

    await calculator.write.multiply([3n, 7n]);
    await calculator.write.reset();
    assert.equal(await calculator.read.result(), 0n);

    await calculator.write.divide([100n, 4n]);
    await calculator.write.reset();
    assert.equal(await calculator.read.result(), 0n);
  });
});
