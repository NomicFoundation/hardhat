import assert from "node:assert/strict";
import type { Contract } from "ethers";
import { network } from "hardhat";

const connection = network.mocha.connectToSingleton();

describe("connectToSingleton ethers - direct usage", function () {
  const expectedDeploymentAddress =
    "0x057ef64E23666F000b34aE31332854aCBd1c8544";

  let counter: Contract;

  before(async () => {
    const [_first, _second, _third, fourth] =
      await connection.ethers.getSigners();

    counter = await connection.ethers.deployContract("Counter", [], fourth);
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
