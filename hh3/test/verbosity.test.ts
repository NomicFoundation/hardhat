import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.create();

// SAME SCRIPT as hh2/test/verbosity.test.js — only the toolchain differs.
//
// Run it with an increasing `-v` level and look at the call traces:
//
//   npx hardhat test test/verbosity.test.ts -vvv
//   npx hardhat test test/verbosity.test.ts -vvvv
//   npx hardhat test test/verbosity.test.ts -vvvvv
//
// You get a call + event tree, but NO [SLOAD]/[SSTORE] lines at any level:
// storage ops are not part of Hardhat 3's `-v` call-trace model. Compare
// with the HH2 project, where `hardhat-tracer --fulltrace` prints them.
describe("verbosity compare (HH3)", function () {
  it("deploy + initialize(7,{value:123}) [emits event + writes storage] + version()", async function () {
    const c = await ethers.deployContract("Initializable__Mock"); // CREATE
    await (await c.initialize(7, { value: 123 })).wait(); // 2x SSTORE + event
    await c.version(); // SLOAD
    await expect(c.initialize(7)).to.be.revertedWith(
      "Contract is already initialized",
    ); // failing call
  });
});
