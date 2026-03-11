import assert from "node:assert/strict";
import type { Contract } from "ethers";
import { network } from "hardhat";

const {
  ethers: { deployContract, getSigners },
} = network.mocha.connectToSingleton();

describe("connectToSingleton ethers - deep nested destructuring usage", function () {
  let counter: Contract;

  before(async () => {
    const [_first, _second, third] = await getSigners();

    counter = await deployContract("Counter", [], third);
  });

  it("should support invoking read and write functions on the contract", async function () {
    assert.equal(await counter.x(), 0n);
    await counter.inc();
    assert.equal(await counter.x(), 1n);
  });
});
