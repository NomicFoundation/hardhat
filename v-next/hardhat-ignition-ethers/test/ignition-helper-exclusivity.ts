/* eslint-disable import/no-unused-modules */
import { assert } from "chai";
import { resetHardhatContext } from "hardhat/plugins-testing.js";
import path from "path";

describe("ignition helper mutual exclusivity", () => {
  before(function () {
    process.chdir(
      path.join(__dirname, "./fixture-projects", "with-fake-helper"),
    );
  });

  after(function () {
    resetHardhatContext();
  });

  it("should error when loaded in conjunction with hardhat-ignition-viem", async function () {
    assert.throws(
      () => require("hardhat"),
      /Found viem and ethers, but only one Hardhat Ignition extension plugin can be used at a time\./,
    );
  });
});
