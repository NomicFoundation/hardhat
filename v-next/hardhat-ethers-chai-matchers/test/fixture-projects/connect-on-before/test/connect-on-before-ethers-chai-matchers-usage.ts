import { expect } from "chai";
import { network } from "hardhat";
import type { NetworkConnection } from "hardhat/types/network";

async function deployCounter(connection: NetworkConnection) {
  const counter = await connection.ethers.deployContract("Counter");
  return { counter };
}

describe("connectOnBefore ethers chai matchers usage", async function () {
  const { networkHelpers } = network.mocha.connectOnBefore();

  it("should support using chai matchers to assert against events", async function () {
    const { counter } = await networkHelpers.loadFixture(deployCounter);

    await expect(counter.inc()).to.emit(counter, "Increment").withArgs(1n);
  });
});
