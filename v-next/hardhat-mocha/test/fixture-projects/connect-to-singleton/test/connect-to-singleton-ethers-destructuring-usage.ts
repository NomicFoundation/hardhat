import assert from "node:assert/strict";
import type { Contract } from "ethers";
import { network } from "hardhat";

const { ethers } = network.mocha.connectToSingleton();

describe("connectToSingleton ethers - destructuring usage", function () {
  const expectedDeploymentAddress =
    "0x8464135c8F25Da09e49BC8782676a84730C318bC";

  let counter: Contract;

  before(async () => {
    const [_first, second] = await ethers.getSigners();

    counter = await ethers.deployContract("Counter", [], second);
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
