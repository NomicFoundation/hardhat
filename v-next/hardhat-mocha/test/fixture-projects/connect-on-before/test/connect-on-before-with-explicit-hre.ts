import assert from "node:assert/strict";
import type { Contract } from "ethers";
import { createHardhatRuntimeEnvironment } from "hardhat/hre";

import hardhatEthersPlugin from "@nomicfoundation/hardhat-ethers";
import HardhatMochaPlugin from "../../../../src/index.js";

const hre = await createHardhatRuntimeEnvironment({
  plugins: [hardhatEthersPlugin, HardhatMochaPlugin],
});

describe("connectOnBefore via `createHardhatRuntimeEnvironment`", function () {
  const expectedDeploymentAddress =
    "0x5FbDB2315678afecb367f032d93F642f64180aa3";

  describe("direct usage", () => {
    const connection = hre.network.mocha.connectOnBefore();
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
  });
});
