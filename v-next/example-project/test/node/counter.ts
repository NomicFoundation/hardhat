import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import hre from "hardhat";
import { ContractReturnType } from "@nomicfoundation/hardhat-viem/types";

const { viem } = await hre.network.connect();

// This test suite is used to generate gas usage data for the Counter contract
describe("Counter", () => {
  let counter: ContractReturnType<"Counter">;

  before(async () => {
    counter = await viem.deployContract("Counter");
  });

  it("should start with x = 0", async () => {
    const x = await counter.read.x();
    assert.equal(x, 0n);
  });

  it("should increment multiple times", async () => {
    await counter.write.inc();
    await counter.write.inc();
    await counter.write.inc();
    const x = await counter.read.x();
    assert.equal(x, 3n);
  });

  it("should add varying amounts", async () => {
    await counter.write.add([1n]);
    await counter.write.add([10n]);
    await counter.write.add([100n]);
    await counter.write.add([1000n]);
    const x = await counter.read.x();
    assert.equal(x, 1114n); // 3 + 1 + 10 + 100 + 1000
  });

  it("should add with different double flag combinations", async () => {
    await counter.write.add([5n, false]);
    await counter.write.add([10n, true]); // 10 * 2 = 20
    await counter.write.add([2n, false]);
    await counter.write.add([3n, true]); // 3 * 2 = 6
    await counter.write.add([7n, false]);
    const x = await counter.read.x();
    assert.equal(x, 1154n); // 1114 + 5 + 20 + 2 + 6 + 7
  });

  it("should handle edge cases and large numbers", async () => {
    await counter.write.add([0n]);
    await counter.write.add([999999n]);
    await counter.write.add([1n, true]); // 1 * 2 = 2
    const x = await counter.read.x();
    assert.equal(x, 1001155n); // 1154 + 0 + 999999 + 2
  });
});
