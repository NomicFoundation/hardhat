import assert from "node:assert/strict";
import type { Contract } from "ethers";
import { network } from "hardhat";

describe("connectOnBefore ethers usage", function () {
  const expectedDeploymentAddress =
    "0x5FbDB2315678afecb367f032d93F642f64180aa3";

  describe("direct usage", () => {
    const connection = network.mocha.connectOnBefore();
    let counter: Contract;

    before(async () => {
      counter = await connection.ethers.deployContract("Counter");
    });

    it("should support deploying a contract", async function () {
      assert.equal(await counter.getAddress(), expectedDeploymentAddress);
    });

    it("should support invoking read and write functions on the contract", async function () {
      assert.equal(await counter.x(), 0n);
      await counter.inc();
      assert.equal(await counter.x(), 1n);
    });

    it("should support invoking events", async () => {
      const increment = 5n;
      const before = await counter.x();

      const tx = await counter.incBy(increment);
      const receipt = await tx.wait();

      assert.equal(await counter.x(), before + increment);

      const log = receipt.logs
        .map((l: any) => counter.interface.parseLog(l))
        .find((parsed: any) => parsed?.name === "Increment");

      assert.ok(log !== null && log !== undefined);
      assert.equal(log.args.by, increment);
    });
  });

  describe("destructuring usage", () => {
    const { ethers } = network.mocha.connectOnBefore();
    let counter: Contract;

    before(async () => {
      counter = await ethers.deployContract("Counter");
    });

    it("should support deploying a contract", async function () {
      assert.equal(await counter.getAddress(), expectedDeploymentAddress);
    });

    it("should support invoking read and write functions on the contract", async function () {
      assert.equal(await counter.x(), 0n);
      await counter.inc();
      assert.equal(await counter.x(), 1n);
    });
  });

  describe("deep nested destructuring usage", () => {
    const {
      ethers: { deployContract },
    } = network.mocha.connectOnBefore();
    let counter: Contract;

    before(async () => {
      counter = await deployContract("Counter");
    });

    it("should support invoking read and write functions on the contract", async function () {
      assert.equal(await counter.x(), 0n);
      await counter.inc();
      assert.equal(await counter.x(), 1n);
    });
  });
});
