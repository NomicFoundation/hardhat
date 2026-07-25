const { expect } = require("chai");
const { ethers } = require("hardhat");

// SAME SCRIPT as hh3/test/verbosity.test.ts — only the toolchain differs.
//
// Run it through hardhat-tracer and look at the call traces:
//
//   npx hardhat test --v         # verbosity 1: calls, FAILED txs only
//   npx hardhat test --vv        # verbosity 2: + storage, FAILED txs only
//   npx hardhat test --trace     # verbosity 3: calls + events (all txs)
//   npx hardhat test --fulltrace # verbosity 4 (== --vvvv): + [SLOAD]/[SSTORE] (all txs)
//
// At --fulltrace you get [SLOAD]/[SSTORE] lines for every storage op — the
// thing that Hardhat 3's `-v` call traces do NOT print at any level. Compare
// with the HH3 project.
describe("verbosity compare (HH2)", function () {
  it("deploy + initialize(7,{value:123}) [emits event + writes storage] + version()", async function () {
    const c = await ethers.deployContract("Initializable__Mock"); // CREATE
    await (await c.initialize(7, { value: 123 })).wait(); // 2x SSTORE + event
    await c.version(); // SLOAD
    await expect(c.initialize(7)).to.be.revertedWith(
      "Contract is already initialized",
    ); // failing call
  });
});
