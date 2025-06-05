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
