import assert from "node:assert/strict";
import { describe, it } from "mocha";

import { expect } from "chai";

import { anyUint } from "@nomicfoundation/hardhat-ethers-chai-matchers/withArgs";
import { PANIC_CODES } from "@nomicfoundation/hardhat-ethers-chai-matchers/panic";
import hre from "hardhat";

describe("Mocha test", () => {
  it("should work", () => {
    assert.equal(1 + 1, 2);
  });
});

describe("Mocha test with chai-matchers", () => {
  before(async () => {
    await hre.network.connect();
  });

  it("should import variables from the chai-matchers package", () => {
    expect(anyUint).to.be.a("function");
    expect(PANIC_CODES.ASSERTION_ERROR).to.be.a("number");
  });

  it("should have the hardhat additional matchers", () => {
    expect("0x0000010AB").to.not.hexEqual("0x0010abc");
  });
});

describe("Rocket test", () => {
  it("should launch the Apollo 11 rocket", async () => {
    const connection = await hre.network.connect();

    const Rocket = await connection.ethers.getContractFactory("Rocket");
    const rocket = await Rocket.deploy("Apollo 11");

    await rocket.launch();

    expect(await rocket.status()).to.equal("lift-off");
  });
});

describe("Matchers without automining", () => {
  it("emit should wait for the tx to be mined", async () => {
    const { ethers, provider } = await hre.network.connect();

    const Rocket = await ethers.getContractFactory("Rocket");
    const rocket = await Rocket.deploy("Apollo 11");

    await provider.request({ method: "evm_setAutomine", params: [false] });

    try {
      const tx = await rocket.launch();
      const emitPromise = expect(tx).to.emit(rocket, "LaunchWithoutArgs");

      await provider.request({ method: "hardhat_mine", params: [] });
      await emitPromise;
    } finally {
      await provider.request({ method: "evm_setAutomine", params: [true] });
    }
  });

  it("revert should wait for the tx to be mined", async () => {
    const { ethers, provider } = await hre.network.connect();

    const FailingContract = await ethers.getContractFactory("FailingContract");
    const failing = await FailingContract.deploy();

    await provider.request({ method: "evm_setAutomine", params: [false] });

    try {
      // Send the tx manually because fail() is pure, which makes ethers
      // use staticCall instead of sending a real transaction.
      const [signer] = await ethers.getSigners();
      const tx = await signer.sendTransaction({
        to: await failing.getAddress(),
        data: failing.interface.encodeFunctionData("fail"),
        gasLimit: 1_000_000,
      });

      const revertPromise = expect(tx).to.be.revert(ethers);

      await provider.request({ method: "hardhat_mine", params: [] });
      await revertPromise;
    } finally {
      await provider.request({ method: "evm_setAutomine", params: [true] });
    }
  });
});
